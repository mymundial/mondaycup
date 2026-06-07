import AppFooter from "../../components/ui/AppFooter.jsx";

function NonMatchFooter() {
  return <AppFooter fixed />;
}

export function withNonMatchFooter(content) {
  return (
    <>
      {content}
      <NonMatchFooter />
    </>
  );
}
