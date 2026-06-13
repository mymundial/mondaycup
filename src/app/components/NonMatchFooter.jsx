import AppFooter from "../../components/ui/AppFooter.jsx";

function NonMatchFooter({ onFeedback = null, feedbackEnabled = false, feedbackSubmitted = false }) {
  return (
    <AppFooter
      fixed
      onFeedback={onFeedback}
      feedbackEnabled={feedbackEnabled}
      feedbackSubmitted={feedbackSubmitted}
    />
  );
}

export function withNonMatchFooter(content, { onFeedback = null, feedbackEnabled = false, feedbackSubmitted = false } = {}) {
  return (
    <>
      {content}
      <NonMatchFooter
        onFeedback={onFeedback}
        feedbackEnabled={feedbackEnabled}
        feedbackSubmitted={feedbackSubmitted}
      />
    </>
  );
}
