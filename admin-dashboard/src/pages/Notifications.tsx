export default function Notifications() {
  const alerts = [
    {
      title: 'New booking request',
      detail: '3 new paid bookings need worker assignment.',
      time: '2 min ago',
      tone: 'info',
    },
    {
      title: 'Worker verification update',
      detail: '2 workers are pending verification approval.',
      time: '18 min ago',
      tone: 'warning',
    },
    {
      title: 'Payment settlement',
      detail: 'Settlement batch completed successfully for today.',
      time: '1 hour ago',
      tone: 'success',
    },
  ]

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>Notifications</h1>
          <p>Monitor the latest platform activity and alerts.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent alerts</h2>
            <p>Live updates for operations staff</p>
          </div>
        </div>

        <div className="notification-list">
          {alerts.map((alert) => (
            <div key={alert.title} className={`notification-item tone-${alert.tone}`}>
              <div className="notification-badge">{alert.title.slice(0, 1)}</div>

              <div className="notification-copy">
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </div>

              <time>{alert.time}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
