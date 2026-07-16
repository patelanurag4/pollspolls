import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  id: string;
  question: string;
  createdAt: Date;
  options: PollOption[];
};

// Live-update pub/sub only, kept in process memory (poll data itself lives in
// Postgres). Parked on `globalThis` so it survives Next.js dev-mode reloads.
const globalForEmitter = globalThis as unknown as { __pollEmitter?: EventEmitter };
const emitter = globalForEmitter.__pollEmitter ?? (globalForEmitter.__pollEmitter = new EventEmitter().setMaxListeners(0));

const pollInclude = {
  options: {
    include: { _count: { select: { responses: true } } },
  },
} as const;

type RawPoll = {
  id: string;
  question: string;
  createdAt: Date;
  options: { id: string; text: string; _count: { responses: number } }[];
};

function mapPoll(poll: RawPoll): Poll {
  return {
    id: poll.id,
    question: poll.question,
    createdAt: poll.createdAt,
    options: poll.options.map((o) => ({ id: o.id, text: o.text, votes: o._count.responses })),
  };
}

export async function createPoll(question: string, optionTexts: string[]): Promise<Poll> {
  const poll = await prisma.poll.create({
    data: {
      question,
      options: { create: optionTexts.map((text) => ({ text })) },
    },
    include: pollInclude,
  });
  return mapPoll(poll);
}

export async function getPoll(id: string): Promise<Poll | null> {
  const poll = await prisma.poll.findUnique({ where: { id }, include: pollInclude });
  return poll ? mapPoll(poll) : null;
}

export async function listPolls(): Promise<Poll[]> {
  const polls = await prisma.poll.findMany({
    include: pollInclude,
    orderBy: { createdAt: "desc" },
  });
  return polls.map(mapPoll);
}

export async function updatePoll(
  id: string,
  question: string,
  options: { id?: string; text: string }[]
): Promise<Poll | null> {
  const existing = await prisma.poll.findUnique({ where: { id }, include: { options: true } });
  if (!existing) return null;

  const keepIds = new Set(options.filter((o) => o.id).map((o) => o.id as string));
  const removedIds = existing.options.filter((o) => !keepIds.has(o.id)).map((o) => o.id);

  await prisma.$transaction([
    prisma.poll.update({ where: { id }, data: { question } }),
    ...removedIds.map((optionId) => prisma.pollOption.delete({ where: { id: optionId } })),
    ...options
      .filter((o) => o.id)
      .map((o) => prisma.pollOption.update({ where: { id: o.id }, data: { text: o.text } })),
    ...options
      .filter((o) => !o.id)
      .map((o) => prisma.pollOption.create({ data: { text: o.text, pollId: id } })),
  ]);

  const poll = await getPoll(id);
  if (poll) emitter.emit(id, poll);
  return poll;
}

export async function vote(pollId: string, optionId: string, respondentId: string): Promise<Poll | null> {
  const option = await prisma.pollOption.findFirst({ where: { id: optionId, pollId } });
  if (!option) return null;

  await prisma.response.upsert({
    where: { pollId_respondentId: { pollId, respondentId } },
    update: { optionId },
    create: { pollId, optionId, respondentId },
  });

  const poll = await getPoll(pollId);
  if (poll) emitter.emit(pollId, poll);
  return poll;
}

export function subscribe(pollId: string, listener: (poll: Poll) => void) {
  emitter.on(pollId, listener);
  return () => emitter.off(pollId, listener);
}

export async function deletePoll(id: string): Promise<boolean> {
  try {
    await prisma.poll.delete({ where: { id } });
  } catch {
    return false;
  }
  emitter.emit(`${id}:deleted`);
  emitter.removeAllListeners(id);
  return true;
}

export function subscribeToDeletion(pollId: string, listener: () => void) {
  emitter.once(`${pollId}:deleted`, listener);
  return () => emitter.off(`${pollId}:deleted`, listener);
}
