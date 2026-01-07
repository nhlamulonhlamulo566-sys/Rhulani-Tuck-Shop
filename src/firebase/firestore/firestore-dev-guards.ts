export function assertMemoized(target: any) {
  if (process.env.NODE_ENV === 'production') return;

  if (!target || !target.__memo) {
    throw new Error(
      '❌ Firestore query/reference MUST be memoized using useMemoFirebase.\n' +
      'This prevents infinite re-subscriptions and render loops.'
    );
  }
}
