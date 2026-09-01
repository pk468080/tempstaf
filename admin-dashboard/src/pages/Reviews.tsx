export default function Reviews() {
  const reviews = [
    {
      customer: 'Aisha K.',
      worker: 'Raju M.',
      rating: 5,
      text: 'Very professional and on time. The service was excellent.',
    },
    {
      customer: 'Nikhil P.',
      worker: 'Mina S.',
      rating: 4,
      text: 'Good work and communication. Would book again.',
    },
    {
      customer: 'Riya L.',
      worker: 'Anand T.',
      rating: 5,
      text: 'Clean work and fast response. Highly recommended.',
    },
  ]

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>Reviews</h1>
          <p>Monitor customer feedback and worker satisfaction.</p>
        </div>
      </div>

      <div className="review-summary-grid">
        <div className="panel small-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Average rating</h2>
            </div>
          </div>
          <div className="metric-box">
            <strong>4.8</strong>
            <span>out of 5.0</span>
          </div>
        </div>

        <div className="panel small-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Recent reviews</h2>
            </div>
          </div>
          <div className="metric-box">
            <strong>31</strong>
            <span>this week</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Customer feedback</h2>
            <p>Latest reviews across booked services</p>
          </div>
        </div>

        <div className="review-list">
          {reviews.map((review) => (
            <div key={`${review.customer}-${review.worker}`} className="review-item">
              <div className="review-topline">
                <strong>{review.customer}</strong>
                <span>{'★'.repeat(review.rating)}</span>
              </div>

              <div className="review-meta">Worker: {review.worker}</div>
              <p>{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
