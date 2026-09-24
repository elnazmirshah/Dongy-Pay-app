import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange: (v: number) => void;
};

export function StarRating({ value, onChange }: Props) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = (hover || value) >= i;
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="p-1 transition-transform active:scale-90"
            aria-label={`${i} stars`}
          >
            <Star
              className={`h-9 w-9 transition-colors ${
                active
                  ? "fill-primary text-primary"
                  : "fill-transparent text-muted-foreground/40"
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
