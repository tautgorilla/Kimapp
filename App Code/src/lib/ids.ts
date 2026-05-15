import { nanoid } from 'nanoid/non-secure';

export const newId = (): string => nanoid(16);
