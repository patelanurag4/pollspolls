import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: number;
};

type Store = {
  polls: Map<string, Poll>;
  emitter: EventEmitter;
};

// Kept on `globalThis` so the data and emitter survive Next.js dev-mode
// module reloads (each edit would otherwise reset the in-memory store).
const globalForStore = globalThis as unknown as { __pollStore?: Store };

const store: Store =
  globalForStore.__pollStore ??
  (globalForStore.__pollStore = {
    polls: new Map(),
    emitter: new EventEmitter().setMaxListeners(0),
  });

export function createPoll(question: string, optionTexts: string[]): Poll {
  const poll: Poll = {
    id: randomUUID(),
    question,
    options: optionTexts.map((text) => ({
      id: randomUUID(),
      text,
      votes: 0,
    })),
    createdAt: Date.now(),
  };
  store.polls.set(poll.id, poll);
  return poll;
}

export function getPoll(id: string): Poll | undefined {
  return store.polls.get(id);
}

export function vote(pollId: string, optionId: string): Poll | undefined {
  const poll = store.polls.get(pollId);
  if (!poll) return undefined;
  const option = poll.options.find((o) => o.id === optionId);
  if (!option) return undefined;
  option.votes += 1;
  store.emitter.emit(pollId, poll);
  return poll;
}

export function subscribe(pollId: string, listener: (poll: Poll) => void) {
  store.emitter.on(pollId, listener);
  return () => store.emitter.off(pollId, listener);
}

export function listPolls(): Poll[] {
  return Array.from(store.polls.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function deletePoll(id: string): boolean {
  const existed = store.polls.delete(id);
  if (existed) {
    store.emitter.emit(`${id}:deleted`);
    store.emitter.removeAllListeners(id);
  }
  return existed;
}

export function subscribeToDeletion(pollId: string, listener: () => void) {
  store.emitter.once(`${pollId}:deleted`, listener);
  return () => store.emitter.off(`${pollId}:deleted`, listener);
}
