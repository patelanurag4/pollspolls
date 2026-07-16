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
  options: PollOption[];
  createdAt: Date;
};

// Live-update pub/sub only, kept in process memory (poll data itself lives in
// Postgres). Parked on `globalThis` so it survives Next.js dev-mode reloads.
const globalForEmitter = globalThis as unknown as { __pollEmitter?: EventEmitter };
const emitter = globalForEmitter.__pollEmitter ?? (globalForEmitter.__pollEmitter = new EventEmitter().setMaxListeners(0));

export async function createPoll(question: string, optionTexts: string[]): Promise<Poll> {
  return prisma.poll.create({
    data: {
      question,
      options: { create: optionTexts.map((text) => ({ text })) },
    },
    include: { options: true },
  });
}

export async function getPoll(id: string): Promise<Poll | null> {
  return prisma.poll.findUnique({
    where: { id },
    include: { options: true },
  });
}

export async function vote(pollId: string, optionId: string): Promise<Poll | null> {
  const option = await prisma.pollOption.findFirst({ where: { id: optionId, pollId } });
  if (!option) return null;

  await prisma.pollOption.update({
    where: { id: optionId },
    data: { votes: { increment: 1 } },
  });

  const poll = await getPoll(pollId);
  if (poll) emitter.emit(pollId, poll);
  return poll;
}

export function subscribe(pollId: string, listener: (poll: Poll) => void) {
  emitter.on(pollId, listener);
  return () => emitter.off(pollId, listener);
}

export async function listPolls(): Promise<Poll[]> {
  return prisma.poll.findMany({
    include: { options: true },
    orderBy: { createdAt: "desc" },
  });
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
