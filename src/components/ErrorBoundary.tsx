import React, { Component } from 'react';
interface Props { children: React.ReactNode; }
interface State { error: Error | null; }
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#fff' }}>
        <h2 style={{ color: '#b33c2f' }}>Application Error</h2>
        <pre style={{ marginTop: '16px', padding: '16px', background: '#fde8e5', borderRadius: '8px', overflow: 'auto', fontSize: '13px' }}>
          {this.state.error.stack || this.state.error.message}
        </pre>
      </div>;
    }
    return this.props.children;
  }
}
