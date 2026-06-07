import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Monday Cup render error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#0B5F35] p-6 text-[#F5F1E8]">
        <section className="w-full max-w-sm rounded-[2rem] bg-[#06361F] p-6 text-center shadow-2xl ring-1 ring-[#F5F1E8]/15">
          <div className="home-copy-bold text-[28px] uppercase leading-none">Something broke</div>
          <p className="home-copy-regular mt-3 text-[12px] uppercase leading-relaxed tracking-[0.12em] text-[#F5F1E8]/70">
            Monday Cup hit a temporary matchday error. Reset the screen and continue testing.
          </p>
          {this.state.error?.message ? (
            <pre className="mt-4 overflow-auto rounded-2xl bg-black/25 p-3 text-left text-[10px] normal-case text-[#F7D117]/90">
              {this.state.error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.handleReset}
            className="home-copy-bold mt-5 rounded-full bg-[#F7D117] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-[#072D1D]"
          >
            Reset screen
          </button>
        </section>
      </main>
    );
  }
}
