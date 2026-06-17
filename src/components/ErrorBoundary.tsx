import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-heading font-bold text-lg text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              The app encountered an unexpected error. Try refreshing.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline" className="rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
              <Button onClick={() => window.location.reload()} className="rounded-xl gap-2">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
