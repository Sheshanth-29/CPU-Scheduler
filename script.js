// Global variables
let processCount = 0;
let processes = [];
const processColors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

// Initialize with some default processes
window.addEventListener('DOMContentLoaded', () => {
    addProcess();
    addProcess();
    addProcess();
    updateQuantumVisibility();

    document.getElementById('algorithm').addEventListener('change', updateQuantumVisibility);
});

// Update time quantum visibility based on algorithm selection
function updateQuantumVisibility() {
    const algorithm = document.getElementById('algorithm').value;
    const quantumGroup = document.getElementById('quantum-group');

    if (algorithm === 'rr' || algorithm === 'rr-priority') {
        quantumGroup.style.display = 'block';
    } else {
        quantumGroup.style.display = 'none';
    }
}

// Add a new process row
function addProcess() {
    processCount++;
    const tbody = document.getElementById('processTableBody');
    const row = tbody.insertRow();

    row.innerHTML = `
        <td><input type="text" value="P${processCount}" data-field="id"></td>
        <td><input type="number" value="${processCount - 1}" min="0" data-field="arrival"></td>
        <td><input type="number" value="${Math.floor(Math.random() * 8) + 1}" min="1" data-field="burst"></td>
        <td><input type="number" value="${Math.floor(Math.random() * 5) + 1}" min="1" data-field="priority"></td>
        <td><button class="btn btn-remove" onclick="removeProcess(this)">Remove</button></td>
    `;
}

// Remove a process row
function removeProcess(button) {
    const row = button.parentElement.parentElement;
    row.remove();
}

// Collect process data from table
function collectProcessData() {
    const tbody = document.getElementById('processTableBody');
    const rows = tbody.getElementsByTagName('tr');
    processes = [];

    for (let i = 0; i < rows.length; i++) {
        const inputs = rows[i].getElementsByTagName('input');
        const process = {
            id: inputs[0].value,
            arrival: parseInt(inputs[1].value),
            burst: parseInt(inputs[2].value),
            priority: parseInt(inputs[3].value),
            remaining: parseInt(inputs[2].value),
            completion: 0,
            turnaround: 0,
            waiting: 0,
            response: -1,
            color: processColors[i % processColors.length]
        };
        processes.push(process);
    }

    return processes.length > 0;
}

// Run the selected scheduling algorithm
function runSimulation() {
    if (!collectProcessData()) {
        alert('Please add at least one process');
        return;
    }

    const algorithm = document.getElementById('algorithm').value;
    const timeQuantum = parseInt(document.getElementById('timeQuantum').value) || 2;

    let ganttChart = [];

    switch (algorithm) {
        case 'fcfs':
            ganttChart = fcfs();
            break;
        case 'sjf':
            ganttChart = sjf();
            break;
        case 'srtf':
            ganttChart = srtf();
            break;
        case 'priority-np':
            ganttChart = priorityNonPreemptive();
            break;
        case 'priority-p':
            ganttChart = priorityPreemptive();
            break;
        case 'rr':
            ganttChart = roundRobin(timeQuantum);
            break;
        case 'rr-priority':
            ganttChart = roundRobinPriority(timeQuantum);
            break;
    }

    displayResults(ganttChart);
    document.getElementById('formulaSection').style.display = 'block';
    generateFormulaGuide(processes);  // or whatever your process array is called
}

// FCFS Algorithm
function fcfs() {
    const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
    const ganttChart = [];
    let currentTime = 0;

    sortedProcesses.forEach(process => {
        if (currentTime < process.arrival) {
            ganttChart.push({ process: 'Idle', start: currentTime, end: process.arrival });
            currentTime = process.arrival;
        }

        const start = currentTime;
        currentTime += process.burst;

        process.completion = currentTime;
        process.turnaround = process.completion - process.arrival;
        process.waiting = process.turnaround - process.burst;
        process.response = start - process.arrival;

        ganttChart.push({ process: process.id, start, end: currentTime, color: process.color });
    });

    return ganttChart;
}

// SJF Algorithm (Non-Preemptive)
function sjf() {
    const remainingProcesses = [...processes].map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;

    while (completed < processes.length) {
        const available = remainingProcesses.filter(p =>
            p.arrival <= currentTime && p.remaining > 0
        );

        if (available.length === 0) {
            const nextArrival = Math.min(...remainingProcesses
                .filter(p => p.remaining > 0)
                .map(p => p.arrival));
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
        const process = available[0];
        const start = currentTime;

        currentTime += process.burst;
        process.remaining = 0;
        process.completion = currentTime;
        process.turnaround = process.completion - process.arrival;
        process.waiting = process.turnaround - process.burst;
        process.response = start - process.arrival;

        ganttChart.push({ process: process.id, start, end: currentTime, color: process.color });
        completed++;
    }

    return ganttChart;
}

// SRTF Algorithm (Preemptive SJF)
function srtf() {
    const remainingProcesses = processes.map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;
    let lastProcess = null;

    while (completed < processes.length) {
        const available = remainingProcesses.filter(p =>
            p.arrival <= currentTime && p.remaining > 0
        );

        if (available.length === 0) {
            const nextArrival = Math.min(...remainingProcesses
                .filter(p => p.remaining > 0)
                .map(p => p.arrival));
            if (lastProcess) {
                ganttChart.push(lastProcess);
                lastProcess = null;
            }
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
        const process = available[0];

        if (process.response === -1) {
            process.response = currentTime - process.arrival;
        }

        if (lastProcess && lastProcess.process === process.id) {
            lastProcess.end = currentTime + 1;
        } else {
            if (lastProcess) {
                ganttChart.push(lastProcess);
            }
            lastProcess = { process: process.id, start: currentTime, end: currentTime + 1, color: process.color };
        }

        process.remaining--;
        currentTime++;

        if (process.remaining === 0) {
            process.completion = currentTime;
            process.turnaround = process.completion - process.arrival;
            process.waiting = process.turnaround - process.burst;
            completed++;
        }
    }

    if (lastProcess) {
        ganttChart.push(lastProcess);
    }

    return ganttChart;
}

// Priority Scheduling (Non-Preemptive)
function priorityNonPreemptive() {
    const remainingProcesses = [...processes].map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;

    while (completed < processes.length) {
        const available = remainingProcesses.filter(p =>
            p.arrival <= currentTime && p.remaining > 0
        );

        if (available.length === 0) {
            const nextArrival = Math.min(...remainingProcesses
                .filter(p => p.remaining > 0)
                .map(p => p.arrival));
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        available.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
        const process = available[0];
        const start = currentTime;

        currentTime += process.burst;
        process.remaining = 0;
        process.completion = currentTime;
        process.turnaround = process.completion - process.arrival;
        process.waiting = process.turnaround - process.burst;
        process.response = start - process.arrival;

        ganttChart.push({ process: process.id, start, end: currentTime, color: process.color });
        completed++;
    }

    return ganttChart;
}

// Priority Scheduling (Preemptive)
function priorityPreemptive() {
    const remainingProcesses = processes.map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;
    let lastProcess = null;

    while (completed < processes.length) {
        const available = remainingProcesses.filter(p =>
            p.arrival <= currentTime && p.remaining > 0
        );

        if (available.length === 0) {
            const nextArrival = Math.min(...remainingProcesses
                .filter(p => p.remaining > 0)
                .map(p => p.arrival));
            if (lastProcess) {
                ganttChart.push(lastProcess);
                lastProcess = null;
            }
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        available.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
        const process = available[0];

        if (process.response === -1) {
            process.response = currentTime - process.arrival;
        }

        if (lastProcess && lastProcess.process === process.id) {
            lastProcess.end = currentTime + 1;
        } else {
            if (lastProcess) {
                ganttChart.push(lastProcess);
            }
            lastProcess = { process: process.id, start: currentTime, end: currentTime + 1, color: process.color };
        }

        process.remaining--;
        currentTime++;

        if (process.remaining === 0) {
            process.completion = currentTime;
            process.turnaround = process.completion - process.arrival;
            process.waiting = process.turnaround - process.burst;
            completed++;
        }
    }

    if (lastProcess) {
        ganttChart.push(lastProcess);
    }

    return ganttChart;
}

// Round Robin Algorithm
function roundRobin(quantum) {
    const queue = [];
    const remainingProcesses = processes.map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;

    remainingProcesses.sort((a, b) => a.arrival - b.arrival);
    let processIndex = 0;

    while (completed < processes.length) {
        while (processIndex < remainingProcesses.length &&
               remainingProcesses[processIndex].arrival <= currentTime) {
            if (remainingProcesses[processIndex].remaining > 0) {
                queue.push(remainingProcesses[processIndex]);
            }
            processIndex++;
        }

        if (queue.length === 0) {
            const nextArrival = processIndex < remainingProcesses.length ?
                remainingProcesses[processIndex].arrival : currentTime + 1;
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        const process = queue.shift();

        if (process.response === -1) {
            process.response = currentTime - process.arrival;
        }

        const executeTime = Math.min(quantum, process.remaining);
        const start = currentTime;
        currentTime += executeTime;
        process.remaining -= executeTime;

        ganttChart.push({ process: process.id, start, end: currentTime, color: process.color });

        while (processIndex < remainingProcesses.length &&
               remainingProcesses[processIndex].arrival <= currentTime) {
            if (remainingProcesses[processIndex].remaining > 0) {
                queue.push(remainingProcesses[processIndex]);
            }
            processIndex++;
        }

        if (process.remaining > 0) {
            queue.push(process);
        } else {
            process.completion = currentTime;
            process.turnaround = process.completion - process.arrival;
            process.waiting = process.turnaround - process.burst;
            completed++;
        }
    }

    return ganttChart;
}

// Round Robin with Priority
function roundRobinPriority(quantum) {
    const queues = [[], [], [], [], []];
    const remainingProcesses = processes.map(p => ({ ...p, remaining: p.burst }));
    const ganttChart = [];
    let currentTime = 0;
    let completed = 0;

    remainingProcesses.sort((a, b) => a.arrival - b.arrival);
    let processIndex = 0;

    while (completed < processes.length) {
        while (processIndex < remainingProcesses.length &&
               remainingProcesses[processIndex].arrival <= currentTime) {
            if (remainingProcesses[processIndex].remaining > 0) {
                const priority = Math.min(remainingProcesses[processIndex].priority - 1, 4);
                queues[priority].push(remainingProcesses[processIndex]);
            }
            processIndex++;
        }

        let process = null;
        let queueIndex = -1;

        for (let i = 0; i < queues.length; i++) {
            if (queues[i].length > 0) {
                process = queues[i].shift();
                queueIndex = i;
                break;
            }
        }

        if (!process) {
            const nextArrival = processIndex < remainingProcesses.length ?
                remainingProcesses[processIndex].arrival : currentTime + 1;
            ganttChart.push({ process: 'Idle', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        if (process.response === -1) {
            process.response = currentTime - process.arrival;
        }

        const executeTime = Math.min(quantum, process.remaining);
        const start = currentTime;
        currentTime += executeTime;
        process.remaining -= executeTime;

        ganttChart.push({ process: process.id, start, end: currentTime, color: process.color });

        while (processIndex < remainingProcesses.length &&
               remainingProcesses[processIndex].arrival <= currentTime) {
            if (remainingProcesses[processIndex].remaining > 0) {
                const priority = Math.min(remainingProcesses[processIndex].priority - 1, 4);
                queues[priority].push(remainingProcesses[processIndex]);
            }
            processIndex++;
        }

        if (process.remaining > 0) {
            queues[queueIndex].push(process);
        } else {
            process.completion = currentTime;
            process.turnaround = process.completion - process.arrival;
            process.waiting = process.turnaround - process.burst;
            completed++;
        }
    }

    return ganttChart;
}

// Display results
function displayResults(ganttChart) {
    drawGanttChart(ganttChart);
    displayResultsTable();
    displayStatistics(ganttChart);
    

    document.getElementById('ganttSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('statisticsSection').style.display = 'block';

    document.getElementById('ganttSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Draw Gantt Chart
function drawGanttChart(ganttChart) {
    const canvas = document.getElementById('ganttChart');
    const ctx = canvas.getContext('2d');

    const totalTime = ganttChart[ganttChart.length - 1].end;
    const blockHeight = 60;
    const padding = 80;
    const scale = Math.min(40, (window.innerWidth - 2 * padding) / totalTime);

    canvas.width = totalTime * scale + 2 * padding;
    canvas.height = blockHeight + 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ganttChart.forEach(block => {
        const x = block.start * scale + padding;
        const width = (block.end - block.start) * scale;

        if (block.process === 'Idle') {
            ctx.fillStyle = '#e5e7eb';
            ctx.strokeStyle = '#9ca3af';
        } else {
            ctx.fillStyle = block.color;
            ctx.strokeStyle = darkenColor(block.color, 20);
        }

        ctx.fillRect(x, 20, width, blockHeight);
        ctx.strokeRect(x, 20, width, blockHeight);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(block.process, x + width / 2, 20 + blockHeight / 2);

        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Segoe UI';
        ctx.fillText(block.start, x, blockHeight + 40);

        if (block === ganttChart[ganttChart.length - 1]) {
            ctx.fillText(block.end, x + width, blockHeight + 40);
        }
    });

    displayLegend();
}

// Darken color helper
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Display legend
function displayLegend() {
    const legendDiv = document.getElementById('ganttLegend');
    legendDiv.innerHTML = '';

    processes.forEach(process => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background-color: ${process.color}"></div>
            <span>${process.id}</span>
        `;
        legendDiv.appendChild(item);
    });
}

// Display results table
function displayResultsTable() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    processes.forEach(process => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${process.id}</strong></td>
            <td>${process.arrival}</td>
            <td>${process.burst}</td>
            <td>${process.completion}</td>
            <td>${process.turnaround}</td>
            <td>${process.waiting}</td>
            <td>${process.response}</td>
        `;
    });
}

// Display statistics
function displayStatistics(ganttChart) {
    const totalProcesses = processes.length;
    const totalWaitingTime = processes.reduce((sum, p) => sum + p.waiting, 0);
    const totalTurnaroundTime = processes.reduce((sum, p) => sum + p.turnaround, 0);
    const totalResponseTime = processes.reduce((sum, p) => sum + p.response, 0);

    const avgWaitingTime = (totalWaitingTime / totalProcesses).toFixed(2);
    const avgTurnaroundTime = (totalTurnaroundTime / totalProcesses).toFixed(2);
    const avgResponseTime = (totalResponseTime / totalProcesses).toFixed(2);

    const totalTime = ganttChart[ganttChart.length - 1].end;
    const idleTime = ganttChart
        .filter(block => block.process === 'Idle')
        .reduce((sum, block) => sum + (block.end - block.start), 0);

    const cpuUtilization = (((totalTime - idleTime) / totalTime) * 100).toFixed(2);
    const throughput = (totalProcesses / totalTime).toFixed(2);

    document.getElementById('avgWaitingTime').textContent = avgWaitingTime;
    document.getElementById('avgTurnaroundTime').textContent = avgTurnaroundTime;
    document.getElementById('avgResponseTime').textContent = avgResponseTime;
    document.getElementById('cpuUtilization').textContent = cpuUtilization + '%';
    document.getElementById('throughput').textContent = throughput + ' processes/unit';
}

// Reset all data
function resetAll() {
    const tbody = document.getElementById('processTableBody');
    tbody.innerHTML = '';
    processCount = 0;
    processes = [];

    addProcess();
    addProcess();
    addProcess();

    document.getElementById('ganttSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('statisticsSection').style.display = 'none';
}
// ===============================
// FORMULA GUIDE FEATURE
// ===============================

// Call this at end of displayResults()
function generateFormulaGuide() {

    const container = document.getElementById('formulaCalculations');
    if (!container) return;

    // Clear only dynamic calculations
    container.innerHTML = '';

    processes.forEach(process => {
        const card = document.createElement('div');
        card.className = 'formula-card';

        card.innerHTML = `
            <h4>${process.id}</h4>

            <p><strong>Turnaround Time</strong></p>
            <p>${process.id} TAT = Completion - Arrival</p>
            <p>= ${process.completion} - ${process.arrival}</p>
            <p>= ${process.turnaround}</p>

            <hr>

            <p><strong>Waiting Time</strong></p>
            <p>${process.id} WT = Turnaround - Burst</p>
            <p>= ${process.turnaround} - ${process.burst}</p>
            <p>= ${process.waiting}</p>

            <hr>

            <p><strong>Response Time</strong></p>
            <p>${process.id} RT = First Execution - Arrival</p>
            <p>= ${process.response + process.arrival} - ${process.arrival}</p>
            <p>= ${process.response}</p>
        `;

        container.appendChild(card);
    });
}

// Toggle explanation visibility
function toggleFormulaGuide() {
    const content = document.getElementById('formulaContent');
    const btn = document.getElementById('formulaToggleBtn');

    if (!content) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.textContent = 'Hide Explanation';
    } else {
        content.style.display = 'none';
        btn.textContent = 'Show Explanation';
    }
}

