import React, { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { colors } from "@/design/colors";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  onReset?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      // Keep the original error visible during development.
      console.error(error);
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-sm font-medium" style={{ color: colors.severity.high }}>
            该图表加载失败，请刷新或在浏览器控制台查看详情
          </div>
          <Button type="button" variant="outline" onClick={this.handleReset}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }
}
