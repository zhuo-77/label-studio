import { inject, observer } from "mobx-react";
import { Button } from "@humansignal/ui";

const SCORE_FILTER_ID = "filter:tasks:annotation_result_score";
const SCORE_OPERATOR = "less";
const SCORE_THRESHOLD = 5;

const injector = inject(({ store }) => ({
  store,
  currentView: store.currentView,
}));

export const ScoreFilterButton = injector(
  observer(({ currentView, size }) => {
    if (!currentView) return null;

    const filterType = currentView.availableFilters.find((f) => f.id === SCORE_FILTER_ID);

    if (!filterType) return null;

    const existingFilter = currentView.filters.find(
      (f) =>
        f.filter.id === SCORE_FILTER_ID && f.operator === SCORE_OPERATOR && Number(f.currentValue) === SCORE_THRESHOLD,
    );

    const isActive = !!existingFilter;

    const handleClick = () => {
      if (isActive) {
        existingFilter.delete();
      } else {
        currentView.addQuickFilter(SCORE_FILTER_ID, SCORE_OPERATOR, SCORE_THRESHOLD);
      }
    };

    return (
      <Button
        size={size ?? "small"}
        look={isActive ? "filled" : "outlined"}
        variant={isActive ? "primary" : "neutral"}
        onClick={handleClick}
        aria-label="Filter tasks with annotation score below 5"
        tooltip={isActive ? "Remove score < 5 filter" : "Filter tasks with annotation score < 5"}
      >
        Score &lt; 5
      </Button>
    );
  }),
);
