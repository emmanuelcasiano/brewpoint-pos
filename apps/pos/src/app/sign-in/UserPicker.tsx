import type { PinUserEntry } from '@brewpoint/shared';

/** The people who can sign in on this register, as tiles. The chosen one is marked selected. */
export function UserPicker({
  users,
  selectedId,
  onSelect,
}: {
  users: PinUserEntry[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
}) {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(var(--tile-min),1fr))] gap-3">
      {users.map((user) => {
        const selected = user.id === selectedId;
        return (
          <button
            key={user.id}
            type="button"
            className={selected ? 'bp-tile is-selected' : 'bp-tile'}
            aria-pressed={selected}
            onClick={() => onSelect(user.id)}
          >
            <span className="bp-tile__name">{user.name}</span>
            <span className="bp-tile__foot text-body-sm text-ink-muted">{user.roleName}</span>
          </button>
        );
      })}
    </div>
  );
}
