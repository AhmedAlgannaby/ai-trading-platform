import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('UI crash caught by ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6" role="alert">
          <div className="max-w-md text-center space-y-3">
            <p className="text-lg font-semibold">حدث خطأ غير متوقع في هذه الصفحة</p>
            <p className="text-sm text-muted-foreground">أعد تحميل الصفحة أو انتقل لصفحة أخرى. تم تسجيل الخطأ في وحدة التحكم.</p>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
