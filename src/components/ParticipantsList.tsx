interface ParticipantsListProps {
  participants: any[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">参加者:</span>
      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => (
          <div
            key={participant.session_id}
            className="px-3 py-1 bg-orange-100 text-gray-800 rounded-full text-sm font-medium"
          >
            {participant.user_name || 'ゲスト'}
            {participant.local && ' (あなた)'}
          </div>
        ))}
      </div>
      <span className="text-sm text-gray-500">
        ({participants.length}/5)
      </span>
    </div>
  );
}