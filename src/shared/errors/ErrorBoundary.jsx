import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (
      this.state.error
      && previousProps.resetKey !== this.props.resetKey
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ error: null });
  };

  render() {
    const { children, fallback } = this.props;

    if (!this.state.error) {
      return children;
    }

    return typeof fallback === "function"
      ? fallback({
        error: this.state.error,
        resetErrorBoundary: this.resetErrorBoundary,
      })
      : fallback;
  }
}
