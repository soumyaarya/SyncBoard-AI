import './CursorOverlay.css';

function CursorOverlay({ cursors, users }) {
    // Create a map of userId to user info for quick lookup
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));

    return (
        <div className="cursor-overlay">
            {Array.from(cursors.entries()).map(([id, cursor]) => {
                const user = userMap.get(id) || users.find(u => u.socketId === id);
                if (!user || !cursor) return null;

                return (
                    <div
                        key={id}
                        className="remote-cursor"
                        style={{
                            transform: `translate(${cursor.x}px, ${cursor.y}px)`
                        }}
                    >
                        <svg
                            className="cursor-pointer"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M5.5 3.21V20.8c0 .45.54.67.86.36l4.45-4.45h6.72c.34 0 .61-.28.61-.61V3.96c0-.34-.28-.61-.61-.61H6.12c-.34 0-.62.27-.62.61v-.75z" />
                        </svg>
                        <span className="cursor-label">{user.name || 'Guest'}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default CursorOverlay;
