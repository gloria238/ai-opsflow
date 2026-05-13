export default function RunEventList({ events }: { events: any[] }) {
  return (
    <div>
      <h4>Events:</h4>
      <ul>
        {events.map(e => (
          <li key={e.id}>
            Node: {e.nodeId}, Status: {e.status}, Output: {JSON.stringify(e.output)}
          </li>
        ))}
      </ul>
    </div>
  );
}
