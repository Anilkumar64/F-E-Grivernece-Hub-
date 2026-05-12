import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error("Page crashed:", error, info);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <main className="page-shell">
                    <section className="app-container py-8">
                        <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                            Something went wrong while loading this page. Refresh and try again.
                        </div>
                    </section>
                </main>
            );
        }

        return this.props.children;
    }
}
