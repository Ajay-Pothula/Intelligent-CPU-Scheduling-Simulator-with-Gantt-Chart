document.addEventListener('DOMContentLoaded', () => {
    let processes = [];
    const colors = ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6'];
    
    const table = document.getElementById('processTable');
    const resultTable = document.getElementById('resultsTable');
    const gantt = document.getElementById('ganttChart');
    const algo = document.getElementById('algorithm');
    const quantumBox = document.getElementById('quantumGroup');
    const priorityBox = document.getElementById('priorityDirectionGroup');
    const quantum = document.getElementById('timeQuantum');
    
    document.getElementById('addProcess').addEventListener('click', add);
    document.getElementById('calculate').addEventListener('click', run);
    document.getElementById('reset').addEventListener('click', reset);
    algo.addEventListener('change', updateAlgoOptions);
    
    function updateAlgoOptions() {
        quantumBox.classList.toggle('hidden', algo.value !== 'RR');
        priorityBox.classList.toggle('hidden', algo.value !== 'Priority');
    }
    
    function add() {
        const id = document.getElementById('processID');
        const arrival = document.getElementById('arrivalTime');
        const burst = document.getElementById('burstTime');
        const priority = document.getElementById('priority');
        
        if (!id.value || !arrival.value || !burst.value) {
            alert('Fill in Process ID, Arrival Time, and Burst Time');
            return;
        }
        
        if (algo.value === 'Priority' && !priority.value) {
            alert('Enter priority value');
            return;
        }
        
        processes.push({
            id: parseInt(id.value),
            arrival: parseInt(arrival.value),
            burst: parseInt(burst.value),
            priority: algo.value === 'Priority' ? parseInt(priority.value) : 0
        });
        
        updateTable();
        clear([id, arrival, burst, priority]);
    }
    
    function updateTable() {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        processes.forEach(p => {
            const row = tbody.insertRow();
            Object.values(p).forEach(val => {
                const cell = row.insertCell();
                cell.textContent = val;
            });
        });
    }
    
    function clear(inputs) {
        inputs.forEach(i => (i.value = ''));
    }
    
    function reset() {
        processes = [];
        updateTable();
        resultTable.querySelector('tbody').innerHTML = '';
        gantt.innerHTML = '';
        document.getElementById('avgTurnaroundTime').textContent = '0.00';
        document.getElementById('avgWaitingTime').textContent = '0.00';
    }
    
    function run() {
        if (processes.length === 0) {
            alert('Add processes first');
            return;
        }
        
        let result;
        switch (algo.value) {
            case 'FCFS': result = fcfs(); break;
            case 'SJF': result = sjf(); break;
            case 'RR': 
                const q = parseInt(quantum.value);
                if (!q || q <= 0) {
                    alert('Enter valid quantum');
                    return;
                }
                result = rr(q);
                break;
            case 'Priority': result = priority(); break;
        }
        updateResult(result);
    }
    
    function rr(q) {
        let queue = [...processes].map(p => ({ ...p, remaining: p.burst }));
        let time = 0;
        let ganttData = [];
        let result = [];
        
        while (queue.length > 0) {
            let executed = false;
            queue.forEach((p, index) => {
                if (p.arrival <= time && p.remaining > 0) {
                    let runTime = Math.min(q, p.remaining);
                    if (time > 0 && ganttData.length > 0 && ganttData[ganttData.length - 1].end < time) {
                        ganttData.push({ id: 'idle', start: ganttData[ganttData.length - 1].end, end: time });
                    }
                    ganttData.push({ id: p.id, start: time, end: time + runTime });
                    time += runTime;
                    p.remaining -= runTime;
                    executed = true;
                    if (p.remaining === 0) {
                        result.push({ ...p, finish: time, turnaround: time - p.arrival, wait: time - p.arrival - p.burst });
                    }
                }
            });
            if (!executed) {
                time++;
            }
        }
        return { result, ganttData, maxTime: time };
    }
    
    function updateResult({ result, ganttData, maxTime }) {
        const tbody = resultTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        result.forEach(p => {
            const row = tbody.insertRow();
            [p.id, p.arrival, p.burst, p.priority, p.finish, p.wait, p.turnaround].forEach(val => {
                const cell = row.insertCell();
                cell.textContent = val;
            });
        });
        
        document.getElementById('avgTurnaroundTime').textContent = (result.reduce((sum, p) => sum + p.turnaround, 0) / result.length).toFixed(2);
        document.getElementById('avgWaitingTime').textContent = (result.reduce((sum, p) => sum + p.wait, 0) / result.length).toFixed(2);
        
        updateGantt(ganttData, maxTime);
    }
    
    function updateGantt(ganttData, maxTime) {
        gantt.innerHTML = '';
        ganttData.forEach(p => {
            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.backgroundColor = p.id === 'idle' ? '#ddd' : colors[p.id % colors.length];
            bar.style.left = `${(p.start / maxTime) * 100}%`;
            bar.style.width = `${((p.end - p.start) / maxTime) * 100}%`;
            bar.textContent = p.id === 'idle' ? '' : `P${p.id}`;
            gantt.appendChild(bar);
        });
    }
});
