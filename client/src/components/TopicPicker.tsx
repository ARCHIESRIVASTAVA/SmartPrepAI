import { TOPICS } from "../constants";

/** Topic dropdown, optionally with a free-text topic of the user's own. */
export function TopicPicker({
  value,
  onChange,
  allowCustom = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  disabled?: boolean;
}) {
  const custom = allowCustom && !TOPICS.includes(value);

  return (
    <>
      <label className="field">
        <span className="field-label">Topic</span>

        <select
          value={custom ? "__custom" : value}
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value === "__custom" ? " " : e.target.value)
          }
        >
          {TOPICS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}

          {allowCustom && <option value="__custom">Your own topic…</option>}
        </select>
      </label>

      {custom && (
        <label className="field">
          <span className="field-label">Type a topic</span>

          <input
            type="text"
            maxLength={60}
            value={value.trimStart()}
            disabled={disabled}
            placeholder="e.g. Deadlocks, B-trees, REST vs GraphQL"
            onChange={(e) => onChange(e.target.value || " ")}
          />
        </label>
      )}
    </>
  );
}
