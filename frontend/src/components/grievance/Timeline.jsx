import React, { useMemo } from "react";

/**
 * Timeline component
 *
 * @param {Array}  events      - Array of timeline events
 *    Each event can be:
 *    {
 *      status?: string,
 *      title?: string,
 *      message?: string,
 *      date?: string | Date,
 *      createdAt?: string | Date
 *    }
 *
 * @param {string} emptyText   - Message when there are no events
 */
export default function Timeline({ events = [], emptyText = "No timeline events yet." }) {
    const sortedEvents = useMemo(() => {
        if (!Array.isArray(events)) return [];

        return [...events]
            .map((ev) => {
                const rawDate = ev.date || ev.createdAt;
                const parsedDate = rawDate ? new Date(rawDate) : null;
                const isValidDate =
                    parsedDate instanceof Date && !isNaN(parsedDate.getTime());

                return {
                    ...ev,
                    _parsedDate: isValidDate ? parsedDate : null,
                };
            })
            .sort((a, b) => {
                const da = a._parsedDate ? a._parsedDate.getTime() : Infinity;
                const db = b._parsedDate ? b._parsedDate.getTime() : Infinity;
                return da - db;
            });
    }, [events]);

    if (!sortedEvents.length) {
        return <div className="tl-empty">{emptyText}</div>;
    }

    return (
        <div className="timeline">
            {sortedEvents.map((ev, idx) => {
                const displayStatus = ev.status || ev.title || "Update";

                let displayDate = "-";
                if (ev._parsedDate) {
                    displayDate = ev._parsedDate.toLocaleString();
                }

                return (
                    <div className="tl-item" key={ev.id || ev._id || idx}>
                        <div className="tl-marker" />
                        <div className="tl-body">
                            <div className="tl-head">
                                <div className="tl-status">{displayStatus}</div>
                                <div className="tl-date">{displayDate}</div>
                            </div>
                            {ev.message && (
                                <div className="tl-message">{ev.message}</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
