import { get } from './get';
import { set } from './set';
import { increment } from './increment';
import { decrement } from './decrement';
import { expire } from './expire';
import { deleteKey } from './delete-key';

export const cache = {
  get,
  set,
  increment,
  decrement,
  expire,
  deleteKey,
};
