// Store captured messages to prevent duplicates
const capturedMessages = new Set();
const messages = [];

// Create floating UI with logs
function createUI() {
	// Remove existing UI if present
	const existingUI = document.getElementById('message-capture-ui');
	if (existingUI) {
		existingUI.remove();
	}

	const ui = document.createElement('div');
	ui.id = 'message-capture-ui';
	ui.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 50%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        padding: 10px;
        z-index: 9999;
        color: white;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 25px; /* Assuming the original font size was 12px, 2.5x bigger is 30px */
    `;

	const logs = document.createElement('div');
	logs.id = 'scroll-logs';
	logs.style.cssText = `
        flex-grow: 1;
        overflow-y: auto;
        font-size: 25px; /* Adjusted to 2.5x bigger */
        background: rgba(0, 0, 0, 0.5);
        padding: 5px;
    `;

	const counter = document.createElement('div');
	counter.id = 'message-counter';
	counter.textContent = 'Messages captured: 0';
	counter.style.cssText = `
        font-size: 25px; /* 2.5x bigger */
        color: #00FF00; /* Terminal green text */
    `;

	const saveButton = document.createElement('button');
	saveButton.textContent = 'Save Messages';
	saveButton.style.cssText = `
        width: 100%;
        height: 200px;
        background: #1da1f2;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 60px;
        text-align: center;
    `;
	saveButton.onclick = saveMessages;

	ui.appendChild(logs);
	ui.appendChild(counter);
	ui.appendChild(saveButton);
	document.body.appendChild(ui);
}

// Update logs in UI
function updateLogs(message) {
	const logs = document.getElementById('scroll-logs');
	if (logs) {
		const logEntry = document.createElement('div');
		logEntry.textContent = `${message}`;
		logs.appendChild(logEntry);
		logs.scrollTop = logs.scrollHeight;
		console.log(message);
	}
}

// Update counter in UI
function updateCounter() {
	const counter = document.getElementById('message-counter');
	if (counter) {
		counter.textContent = `Messages captured: ${messages.length}`;
	}
}

// Function to save messages to file
function saveMessages() {
	const messageText = messages
		.map(msg => msg.message)
		.join('\n\n---\n\n');
	const blob = new Blob([messageText], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'agent-alpha.txt';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	updateLogs(`Saved ${messages.length} messages to file`);
}

// TODO: Add timestamp and author extraction
// function extractMessageData(messageEntry) {

// 	console.log(messageEntry);

// 	// Get timestamp and author using the dot separator as reference
// 	const dotSeparator = Array.from(messageEntry.querySelectorAll('span')).find(span => span.textContent === ' ·');
// 	console.log(dotSeparator);

// 	let timestamp, author;
// 	if (dotSeparator) {
// 		console.log(dotSeparator.parentElement);
// 		// Timestamp is two spans after the dot
// 		timestamp = dotSeparator.parentElement.querySelector('span:nth-child(3)')?.textContent;

// 		// Author is the first span before the dot
// 		const authorSpan = dotSeparator.previousElementSibling;
// 		author = authorSpan?.querySelector('span')?.textContent?.trim();
// 	}

// 	// Get message text - check both direct messages and replies
// 	const messageTexts = Array.from(messageEntry.querySelectorAll('[data-testid="tweetText"]'))
// 		.map(element => element.textContent?.trim())
// 		.filter(text => text); // Remove empty texts

// 	const messageText = messageTexts.join('\n'); // Combine multiple message elements if present

// 	console.log('Found message:', { timestamp, author, messageText });

// 	if (messageText && author) {
// 		const messageId = `${timestamp}-${author}-${messageText}`;
// 		if (!capturedMessages.has(messageId)) {
// 			capturedMessages.add(messageId);
// 			messages.push({
// 				timestamp,
// 				author,
// 				message: messageText
// 			});
// 			updateLogs(`New message from ${author}: ${messageText.substring(0, 50)}...`);
// 			updateCounter();
// 			return true;
// 		} else {
// 			console.log('Duplicate message found, skipping');
// 		}
// 	} else {
// 		console.log('Incomplete message data:', { timestamp, author, messageText });
// 	}
// 	return false;
// }

// TODO: Add timestamp and author extraction
function extractMessageData(messageEntry) {

	// TODO: fix bug where this doesn't work for replies

	// Get message text - check both direct messages and replies
	const messageTexts = Array.from(messageEntry.querySelectorAll('[data-testid="tweetText"]'))
		.map(element => element.textContent?.trim())
		.filter(text => text); // Remove empty texts

	const messageText = messageTexts.join('\n'); // Combine multiple message elements if present

	console.log('Found message:', { messageText });

	if (messageText) {
		if (!capturedMessages.has(messageText)) {
			capturedMessages.add(messageText);
			messages.push({
				message: messageText
			});
			updateLogs(`Scraping message: ${messageText.substring(0, 50)}...`);
			updateCounter();
			return true;
		} else {
			// console.log('Duplicate message found, skipping');
		}
	} else {
		// console.log('Incomplete message data:', { messageText });
	}
	return false;
}

// Set up scroll monitoring
function startCapturing() {
	createUI();

	// Try multiple possible scroll containers
	const possibleContainers = [
		document.querySelector('[data-testid="DmScrollerContainer"]'),
		document.querySelector('.r-1oszu61.r-1xc7w19'),
		document.querySelector('.r-14lw9ot'),
		document.querySelector('.r-yfoy6g'),
		document.documentElement
	];

	const scrollContainer = possibleContainers.find(container => container !== null);

	if (!scrollContainer) {
		updateLogs('ERROR: Could not find scroll container');
		return;
	}

	// Track scroll position
	let lastScrollPosition = scrollContainer.scrollTop;
	let scrollTimeout;

	// Multiple event listeners for redundancy
	['scroll', 'wheel', 'touchmove'].forEach(eventType => {
		scrollContainer.addEventListener(eventType, () => {
			const currentPosition = scrollContainer.scrollTop;

			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				const messageEntries = document.querySelectorAll('[data-testid="messageEntry"]');
				let newMessages = 0;
				messageEntries.forEach(entry => {
					if (extractMessageData(entry)) {
						newMessages++;
					}
				});
			}, 500);

			lastScrollPosition = currentPosition;
		}, { passive: true });
	});

	// Also monitor DOM changes
	const observer = new MutationObserver((mutations) => {
		mutations.forEach(mutation => {
			if (mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach(node => {
					if (node.querySelectorAll) {
						const messageEntries = node.querySelectorAll('[data-testid="messageEntry"]');
						messageEntries.forEach(extractMessageData);
					}
				});
			}
		});
	});

	observer.observe(scrollContainer, {
		childList: true,
		subtree: true
	});

	// Process initial messages
	const initialMessages = document.querySelectorAll('[data-testid="messageEntry"]');
	updateLogs(`Processing ${initialMessages.length} initial messages...`);
	initialMessages.forEach(extractMessageData);
}

// Start the capture process
startCapturing();