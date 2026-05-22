// Global state
let allSessions = [];
let filteredSessions = [];

// Days of the week mapping for calendar
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Online session links mapping
const onlineLinks = {
    'BIOL 251': 'https://csn.rooms.blindsidenetworks.com/rooms/7ju-mlt-rxl-ubw/join',
    'BIOL 189-Matt': 'https://csn.rooms.blindsidenetworks.com/rooms/mqf-nij-ffc-jc7/join'
};

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadScheduleData();
    initializeEventListeners();
    renderListView(allSessions);
});

// Load schedule data from JSON file
async function loadScheduleData() {
    try {
        const response = await fetch('sischedule.json');
        allSessions = await response.json();
        
        // Flatten sessions for easier searching
        allSessions = allSessions.map(session => ({
            ...session,
            allSessions: session.sessions || []
        }));
    } catch (error) {
        console.error('Error loading schedule data:', error);
        document.getElementById('sessionsList').innerHTML = '<p>Error loading schedule data</p>';
    }
}

// Initialize event listeners
function initializeEventListeners() {
    const searchInput = document.getElementById('courseSearch');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', showSuggestions);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-section')) {
            document.getElementById('suggestions').classList.remove('active');
        }
    });

    // View toggle
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const view = e.target.dataset.view;
            document.querySelectorAll('.view-section').forEach(section => {
                section.classList.remove('active');
            });
            
            if (view === 'list') {
                document.getElementById('listView').classList.add('active');
                renderListView(filteredSessions.length > 0 ? filteredSessions : allSessions);
            } else {
                document.getElementById('calendarView').classList.add('active');
                renderCalendarView(filteredSessions.length > 0 ? filteredSessions : allSessions);
            }
        });
    });
}

// Handle search input
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredSessions = allSessions;
        document.getElementById('noResults').style.display = 'none';
    } else {
        filteredSessions = allSessions.filter(session => 
            session.course.toLowerCase().includes(query)
        );
        
        if (filteredSessions.length === 0) {
            document.getElementById('noResults').style.display = 'block';
        } else {
            document.getElementById('noResults').style.display = 'none';
        }
    }
    
    // Re-render current view
    const activeView = document.querySelector('.view-section.active').id;
    if (activeView === 'listView') {
        renderListView(filteredSessions.length > 0 ? filteredSessions : allSessions);
    } else {
        renderCalendarView(filteredSessions.length > 0 ? filteredSessions : allSessions);
    }
}

// Show suggestions
function showSuggestions() {
    const courses = [...new Set(allSessions.map(s => s.course))].sort();
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (courses.length === 0) return;
    
    suggestionsContainer.innerHTML = courses
        .map(course => `<div class="suggestion-item">${course}</div>`)
        .join('');
    
    suggestionsContainer.classList.add('active');
    
    // Add click handlers to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('courseSearch').value = item.textContent;
            document.getElementById('courseSearch').dispatchEvent(new Event('input'));
            suggestionsContainer.classList.remove('active');
        });
    });
}

// Convert time to sortable format (HH:MM)
function timeToMinutes(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridiem = match[3];
    
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
}

// Render list view - grouped by course, then by day, sorted by time
function renderListView(sessions) {
    const listContainer = document.getElementById('sessionsList');

    if (sessions.length === 0) {
        listContainer.innerHTML = '';
        return;
    }

    const courses = {};

    // Group and flatten sessions
    sessions.forEach(session => {
        if (!courses[session.course]) {
            courses[session.course] = [];
        }

        session.allSessions.forEach(s => {
            courses[session.course].push({
                ...s,
                instructor: session.instructor,
                room: session.room,
                topic: s.topic,
                isBiology: session.course.startsWith('BIOL'),
                timeMinutes: timeToMinutes(s.time)
            });
        });
    });

    let html = '';

    Object.keys(courses).sort().forEach(course => {

        const sessionsList = courses[course];

        // Sort by day + time
        sessionsList.sort((a, b) => {
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.timeMinutes - b.timeMinutes;
        });

        // Group by day
        const byDay = {};
        sessionsList.forEach(s => {
            if (!byDay[s.day]) byDay[s.day] = [];
            byDay[s.day].push(s);
        });

        html += `
        <div class="course-group">
            <h2 class="course-title">${course}</h2>
            <div class="course-content">
        `;

        dayOrder.forEach(day => {
            if (!byDay[day]) return;

            html += `
            <div class="day-group">
                <h3 class="day-title">${day}</h3>

                <table class="sessions-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>SI Leader</th>
                            <th>Location</th>
                            <th>Topic</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            byDay[day].forEach(s => {

                html += `
                    <tr>
                        <td>${s.time}</td>
                        <td>${s.instructor}</td>
                        <td>${s.room}</td>
                        <td>${s.isBiology ? (s.topic || 'TBA') : ''}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            </div>
            `;
        });

        html += `</div></div>`;
    });

    listContainer.innerHTML = html;

    // ✅ COLLAPSIBLE
    document.querySelectorAll('.course-title').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;

            const isOpen = content.style.display === 'block';

            document.querySelectorAll('.course-content').forEach(c => c.style.display = 'none');
            document.querySelectorAll('.course-title').forEach(h => h.classList.remove('active'));

            if (!isOpen) {
                content.style.display = 'block';
                header.classList.add('active');
            }
        });
    });
}
``


// Create session card HTML - with sessions grouped and sorted by day and time
function createSessionCard(session) {
    const isBiology = session.course.startsWith('BIOL');
    const isOnline = session.room === 'ONLINE';
    
    // Check for online link - handle both course-only and course-instructor combinations
    const onlineLinkKey = session.course === 'BIOL 189' && session.instructor === 'Matt Scalzi' 
        ? 'BIOL 189-Matt' 
        : session.course;
    const hasOnlineLink = onlineLinks[onlineLinkKey];
    
    const roomCell = isOnline && hasOnlineLink
        ? `<a href="${hasOnlineLink}" class="room-link-inline" target="_blank" rel="noopener noreferrer">🌐 ${session.room}</a>`
        : `<span class="room-text-inline">${isOnline ? '🌐' : '🚪'} ${session.room}</span>`;
    
    // Sort sessions by day order, then by time
    const sortedSessions = [...session.allSessions].sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
    
    // Group sorted sessions by day
    const sessionsByDay = {};
    sortedSessions.forEach(s => {
        if (!sessionsByDay[s.day]) {
            sessionsByDay[s.day] = [];
        }
        sessionsByDay[s.day].push(s);
    });
    
    // Build table rows grouped by day
    let tableRows = '';
    dayOrder.forEach(day => {
        if (sessionsByDay[day]) {
            const daySessions = sessionsByDay[day];
            daySessions.forEach((s, index) => {
                // Only show day name for the first session of that day
                const dayDisplay = index === 0 ? day : '';
                tableRows += `
                    <tr>
                        <td class="day-cell">${dayDisplay}</td>
                        <td class="time-cell">${s.time}</td>
                        <td class="si-leader-cell">${session.instructor}</td>
                        <td class="room-cell">${roomCell}</td>
                        <td class="topic-cell">
                            ${isBiology && s.topic ? s.topic : (isBiology ? '<span class="no-topic">TBA</span>' : '')}
                        </td>
                    </tr>
                `;
            });
        }
    });
    
    return `
        <div class="session-card">
            <table class="sessions-table">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>SI Leader</th>
                        <th>Room</th>
                        ${isBiology ? '<th>Topic</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

// Render calendar view
function renderCalendarView(sessions) {
    const calendarContainer = document.getElementById('calendar');
    
    // Create day headers
    let html = '';
    daysOfWeek.forEach(day => {
        html += `<div class="day-header">${day.substring(0, 3)}</div>`;
    });
    
    // Create calendar grid (simplified - shows one week)
    const eventsByDay = {};
    
    sessions.forEach(session => {
        session.allSessions.forEach(s => {
            if (!eventsByDay[s.day]) {
                eventsByDay[s.day] = [];
            }
            eventsByDay[s.day].push({
                course: session.course,
                time: s.time,
                topic: s.topic,
                room: session.room,
                instructor: session.instructor,
                isBiology: session.course.startsWith('BIOL'),
                timeMinutes: timeToMinutes(s.time)
            });
        });
    });
    
    // Sort events by time within each day
    Object.keys(eventsByDay).forEach(day => {
        eventsByDay[day].sort((a, b) => a.timeMinutes - b.timeMinutes);
    });
    
    // Add events to calendar days
    daysOfWeek.forEach((day, index) => {
        const events = eventsByDay[day] || [];
        const eventHTML = events
            .map(event => `
                <div class="calendar-event">
                    <span class="calendar-event-course">${event.course}</span>
                    <span class="calendar-event-leader">${event.instructor}</span>
                    <span class="calendar-event-time">${event.time}</span>
                    ${event.isBiology && event.topic ? `<span style="font-size: 0.75em; display: block;">${event.topic}</span>` : ''}
                </div>
            `)
            .join('');
        
        html += `
            <div class="calendar-day">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-events">${eventHTML || '<span style="color: #ccc;">No events</span>'}</div>
            </div>
        `;
    });
    
    calendarContainer.innerHTML = html;
}

// Open online session (for courses without a configured link)
function openOnlineSession(event) {
    event.preventDefault();
    alert('Online session link would be opened here. Configure your BigBlueButton/Zoom/Teams link for this course.');
}
