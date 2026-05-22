// Global state
let allSessions = [];
let filteredSessions = [];

// Days of the week mapping for calendar
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
                renderListView(filteredSessions);
            } else {
                document.getElementById('calendarView').classList.add('active');
                renderCalendarView(filteredSessions);
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
        renderListView(filteredSessions);
    } else {
        renderCalendarView(filteredSessions);
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

// Render list view
function renderListView(sessions) {
    const listContainer = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        listContainer.innerHTML = '';
        return;
    }
    
    listContainer.innerHTML = sessions
        .map(session => createSessionCard(session))
        .join('');
}

// Create session card HTML
function createSessionCard(session) {
    const isBiology = session.course.startsWith('BIOL');
    const isOnline = session.room === 'ONLINE';
    
    // Check for online link - handle both course-only and course-instructor combinations
    const onlineLinkKey = session.course === 'BIOL 189' && session.instructor === 'Matt Scalzi' 
        ? 'BIOL 189-Matt' 
        : session.course;
    const hasOnlineLink = onlineLinks[onlineLinkKey];
    
    const roomDisplay = isOnline 
        ? `<a href="${hasOnlineLink || '#'}" class="room-link" ${hasOnlineLink ? 'target="_blank" rel="noopener noreferrer"' : 'onclick="openOnlineSession(event)"'}>🌐 ${session.room}</a>`
        : `<span class="room-text">🚪 ${session.room}</span>`;
    
    const sessionsTable = session.allSessions
        .map(s => `
            <tr>
                <td class="day-cell">${s.day}</td>
                <td class="time-cell">${s.time}</td>
                <td class="topic-cell">
                    ${isBiology && s.topic ? s.topic : (isBiology ? '<span class="no-topic">TBA</span>' : '')}
                </td>
            </tr>
        `)
        .join('');
    
    return `
        <div class="session-card">
            <div class="course-name">${session.course}</div>
            <div class="instructor-name">Instructor: ${session.instructor}</div>
            <div class="room-info">
                ${roomDisplay}
            </div>
            <table class="sessions-table">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Time</th>
                        ${isBiology ? '<th>Topic</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${sessionsTable}
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
                isBiology: session.course.startsWith('BIOL')
            });
        });
    });
    
    // Add events to calendar days
    daysOfWeek.forEach((day, index) => {
        const events = eventsByDay[day] || [];
        const eventHTML = events
            .map(event => `
                <div class="calendar-event">
                    <span class="calendar-event-course">${event.course}</span>
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
