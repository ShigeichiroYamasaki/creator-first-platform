const RETRYABLE_STATES = new Set(['APPROVAL_FAILED', 'FUNDING_FAILED'])

export function participantEnrollmentAction(invitation) {
  const enrollmentState = invitation.enrollment?.state

  if (enrollmentState === 'FUNDED') {
    return { disabled: true, label: '準備完了', hint: 'オンチェーン承認と初回POL配布は完了しています。' }
  }
  if (invitation.state !== 'CLAIMED') {
    return {
      disabled: false,
      label: '承認・初回POL配布',
      hint: '実験参加者が招待リンクから仮想通貨ワレットを登録すると実行できます。'
    }
  }
  if (!invitation.claimedWallet) {
    return {
      disabled: false,
      label: '承認・初回POL配布',
      hint: '本人登録状態に対する仮想通貨ワレット情報がありません。一覧を再取得してください。'
    }
  }
  if (enrollmentState === 'OPERATOR_DISABLED') {
    return {
      disabled: false,
      label: '設定状態を確認',
      hint: '公開サーバの運営ワーカーが無効です。押すと必要な対応を表示します。'
    }
  }
  return {
    disabled: false,
    label: RETRYABLE_STATES.has(enrollmentState) ? '再実行' : '承認・初回POL配布',
    hint: RETRYABLE_STATES.has(enrollmentState)
      ? '前回の処理の続きから安全に再実行します。'
      : '押すと運営ワーカーが参加承認と初回POL配布を順番に実行します。'
  }
}
