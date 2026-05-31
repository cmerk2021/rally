import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AISuggestion } from "@/types";

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept?: () => void;
  onReject?: () => void;
  className?: string;
}

export function AISuggestionCard({ suggestion, onAccept, onReject, className }: AISuggestionCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">AI Suggestion</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {suggestion.suggestion_type.replace("_", " ")}
        </span>
      </div>
      <div className="font-medium">{suggestion.title}</div>
      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.content}</p>
      {(onAccept || onReject) && (
        <div className="mt-3 flex gap-2">
          {onAccept && (
            <Button size="sm" onClick={onAccept}>
              <Check className="mr-1 h-3 w-3" /> Accept
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="outline" onClick={onReject}>
              <X className="mr-1 h-3 w-3" /> Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
