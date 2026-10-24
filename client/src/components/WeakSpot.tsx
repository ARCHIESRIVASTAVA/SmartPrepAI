import { TOPICS } from "../constants";
import { useProgress, weakestTopic } from "../lib/progress";

type Props = { onPick: (topic: string) => void; current: string };

/** Suggests the topic the player is weakest at (or has not tried yet). */
export function WeakSpot({ onPick, current }: Props) {
  const progress = useProgress();
  const { topic, average } = weakestTopic(progress, TOPICS);

  if (topic === current) return null;

  return (
    <p className="weak-spot">
      {average === null
        ? `You haven't practised ${topic} yet.`
        : `Weakest topic: ${topic}, averaging ${
            Math.round(average * 10) / 10
          }/10.`}{" "}
      <button type="button" onClick={() => onPick(topic)}>
        Practise {topic}
      </button>
    </p>
  );
}
