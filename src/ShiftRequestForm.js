import React, { useState, useEffect } from "react";

export default function ShiftRequestsList() {
  const [shiftRequests, setShiftRequests] = useState([]);

  // ローカルストレージから保存された希望シフト一覧を取得
  useEffect(() => {
    const savedRequests = localStorage.getItem("shiftRequestsList");
    if (savedRequests) {
      setShiftRequests(JSON.parse(savedRequests));
    }
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">📝 シフト希望一覧</h2>
      {shiftRequests.length === 0 ? (
        <p>希望シフトがまだ提出されていません。</p>
      ) : (
        <div>
          {shiftRequests.map((request, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg">
              <h3 className="font-semibold text-lg">{request.name}さんのシフト希望</h3>
              <div className="mt-2">
                {Object.entries(request.availability).map(([day, time]) => (
                  <div key={day} className="mb-2">
                    <strong>{day}:</strong> {time || "無し"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
