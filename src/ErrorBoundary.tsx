import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('❌ React Error Boundary caught an error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'Assistant, Arial, sans-serif',
                    direction: 'rtl'
                }}>
                    <h1>שגיאה באפליקציה</h1>
                    <p>מצטערים, משהו השתבש.</p>
                    <details style={{ textAlign: 'right', marginTop: '20px' }}>
                        <summary>פרטי השגיאה</summary>
                        <pre style={{
                            background: '#f5f5f5',
                            padding: '10px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            textAlign: 'left',
                            direction: 'ltr'
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        רענן דף
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
