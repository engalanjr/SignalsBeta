// Signal Details Service - Handle signal detail operations
class SignalDetailsService {

    static openSignalDetails(signalId, app) {
        const signal = app.data.find(s => s.id === signalId);
        if (!signal) return;


        document.getElementById('signalTitle').textContent = signal.name;
        document.getElementById('signalDetails').innerHTML = `
            <div class="signal-detail-content">
                <div class="detail-section">
                    <h3>Signal Information</h3>
                    <p><strong>Account:</strong> ${signal.account_name}</p>
                    <p><strong>Category:</strong> ${signal.category}</p>
                    <p><strong>Priority:</strong> ${signal.priority}</p>
                    <p><strong>Confidence:</strong> ${Math.round(signal.confidence * 100)}%</p>
                </div>
                <div class="detail-section">
                    <h3>Summary</h3>
                    <p>${signal.summary}</p>
                </div>
                <div class="detail-section">
                    <h3>Rationale</h3>
                    <p>${signal.rationale}</p>
                </div>
            </div>
        `;

        document.getElementById('signalDrawer').classList.add('open');

        // Add event listeners for the new buttons
        this.attachDrawerEventListeners(signal, app);
    }

    static closeSignalDrawer() {
        document.getElementById('signalDrawer').classList.remove('open');
    }

    static attachDrawerEventListeners(signal, app) {
        // Like button
        const likeBtn = document.getElementById('drawerLikeSignal');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                if (signal.feedbackType === 'like') {
                    // Toggle off - remove like
                    SignalFeedbackService.acknowledgeSignal(signal.id, 'removed_like', app);
                    signal.feedbackType = null; // Clear feedback
                } else {
                    // Apply like
                    SignalFeedbackService.acknowledgeSignal(signal.id, 'like', app);
                    signal.feedbackType = 'like';
                }
                this.updateDrawerButtonStates(signal);
            });
        }

        // Not Accurate button
        const notAccurateBtn = document.getElementById('drawerNotAccurateSignal');
        if (notAccurateBtn) {
            notAccurateBtn.addEventListener('click', () => {
                if (signal.feedbackType === 'not-accurate') {
                    // Toggle off - remove not-accurate
                    SignalFeedbackService.acknowledgeSignal(signal.id, 'removed_not-accurate', app);
                    signal.feedbackType = null; // Clear feedback
                } else {
                    // Apply not-accurate
                    SignalFeedbackService.acknowledgeSignal(signal.id, 'not-accurate', app);
                    signal.feedbackType = 'not-accurate';
                }
                this.updateDrawerButtonStates(signal);
            });
        }

    }

    static updateDrawerButtonStates(signal) {
        const likeBtn = document.getElementById('drawerLikeSignal');
        const notAccurateBtn = document.getElementById('drawerNotAccurateSignal');

        if (likeBtn && notAccurateBtn) {
            // Reset all buttons to default state
            likeBtn.className = 'btn btn-secondary';
            likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Like';

            notAccurateBtn.className = 'btn btn-secondary';
            notAccurateBtn.innerHTML = '<i class="fas fa-thumbs-down"></i> Not Accurate';


            // Apply feedback-specific styling
            if (signal.feedbackType === 'like') {
                likeBtn.className = 'btn btn-primary liked-btn';
                likeBtn.innerHTML = '<i class="fas fa-check"></i> Liked!';
            } else if (signal.feedbackType === 'not-accurate') {
                notAccurateBtn.className = 'btn btn-warning not-accurate-btn';
                notAccurateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Marked Inaccurate';
            }
        }
    }

    static generateEventSource(signal) {
        const eventTypes = {
            'Architecture': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Technical Architecture Discussion',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-call-123'
                },
                {
                    type: 'Support Ticket',
                    icon: 'fas fa-ticket-alt',
                    title: 'Performance Issues with Data Pipeline',
                    linkText: 'View Ticket',
                    link: 'https://support.company.com/ticket/arch-456'
                }
            ],
            'Relationship': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Quarterly Business Review',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-qbr-789'
                },
                {
                    type: 'Email Thread',
                    icon: 'fas fa-envelope',
                    title: 'Stakeholder Change Notification',
                    linkText: 'View Email Thread',
                    link: 'https://outlook.office.com/mail/id/rel-email-123'
                }
            ],
            'Use Case': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Use Case Discovery Session',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-discovery-456'
                },
                {
                    type: 'Meeting Notes',
                    icon: 'fas fa-file-alt',
                    title: 'Requirements Gathering Meeting',
                    linkText: 'View Meeting Notes',
                    link: 'https://docs.company.com/meeting/uc-notes-789'
                }
            ],
            'User Engagement': [
                {
                    type: 'Usage Analytics',
                    icon: 'fas fa-chart-line',
                    title: 'Weekly Usage Report',
                    linkText: 'View Analytics Dashboard',
                    link: 'https://analytics.company.com/dashboard/usage-123'
                },
                {
                    type: 'User Survey',
                    icon: 'fas fa-poll',
                    title: 'Customer Satisfaction Survey',
                    linkText: 'View Survey Results',
                    link: 'https://surveys.company.com/results/csat-456'
                }
            ],
            'Business': [
                {
                    type: 'Gong Call Recording',
                    icon: 'fas fa-video',
                    title: 'Budget Review Meeting',
                    linkText: 'View Call Recording',
                    link: 'https://app.gong.io/call?id=mock-budget-789'
                },
                {
                    type: 'Contract Discussion',
                    icon: 'fas fa-handshake',
                    title: 'Renewal Strategy Session',
                    linkText: 'View Contract Details',
                    link: 'https://contracts.company.com/renewal/bus-123'
                }
            ],
            'Enablement': [
                {
                    type: 'Training Session',
                    icon: 'fas fa-graduation-cap',
                    title: 'Platform Training Workshop',
                    linkText: 'View Training Materials',
                    link: 'https://training.company.com/session/enable-456'
                },
                {
                    type: 'User Feedback',
                    icon: 'fas fa-comments',
                    title: 'Training Effectiveness Survey',
                    linkText: 'View Feedback',
                    link: 'https://feedback.company.com/training/survey-789'
                }
            ]
        };

        const categoryEvents = eventTypes[signal.category] || eventTypes['Use Case'];
        const randomEvent = categoryEvents[Math.floor(Math.random() * categoryEvents.length)];

        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 30));

        return {
            ...randomEvent,
            date: eventDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        };
    }
}