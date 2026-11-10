import { cx } from '../lib/cx';
import styles from './Avatar.module.css';

const PALETTE_SIZE = 8;

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

/** "Gabriela Osorio" → "GO". */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** The same name always gets the same colour, so people are easy to spot again. */
function colorIndex(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % PALETTE_SIZE;
}

/**
 * Initials in a coloured circle. Decorative: the person's name is always
 * written next to it, so the avatar is hidden from screen readers.
 */
export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <span
      className={cx(styles.avatar, styles[size], styles[`c${colorIndex(name)}`])}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
