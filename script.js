document.addEventListener('DOMContentLoaded', () => {
    let processes = [];
    const colors = ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6'];
    
    const table = document.getElementById('processTable');
    const results = document.getElementById('resultsTable');
    const chart = document.getElementById('ganttChart');
    const algo = document.getElementById('algorithm');
    const quantumBox = document.getElementById('quantumGroup');
    const priorityBox = document.getElementById('priorityDirectionGroup');
    const quantum = document.getElementById('timeQuantum');
    
    document.getElementById('addProcess').addEventListener('click', addProcess);
    document.getElementById('calculate').addEventListener('click', calculate);
    document.getElementById('reset').addEventListener('click', reset);
    algo.addEventListener('change', toggleOptions);
    
    function toggleOptions() {
        quantumBox.classList.toggle('hidden', algo.value !== 'RR');
        priorityBox.classList.toggle('hidden', algo.value !== 'Priority');
    }
    
    function addProcess() {
        let id = document.getElementById('processID').value;
        let at = document.getElementById('arrivalTime').value;
        let bt = document.getElementById('burstTime').value;
        let prio = document.getElementById('priority').value || 0;
        
        if (!id || !at || !bt || (algo.value === 'Priority' && !prio)) {
            alert('Fill all required fields');
            return;
        }
        
        processes.push({
            id: parseInt(id),
            at: parseInt(at),
            bt: parseInt(bt),
            prio: algo.value === 'Priority' ? parseInt(prio) : 0
        });
        updateTable();
    }
    
    function updateTable() {
        let tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        processes.forEach(p => {
            let row = tbody.insertRow();
            [p.id, p.at, p.bt, p.prio].forEach(val => {
                let cell = row.insertCell();
                cell.textContent = val;
            });
        });
    }
    
    function reset() {
        processes = [];
        updateTable();
        results.querySelector('tbody').innerHTML = '';
        chart.innerHTML = '';
        document.getElementById('avgTurnaroundTime').textContent = '0.00';
        document.getElementById('avgWaitingTime').textContent = '0.00';
    }
    
    function calculate() {
        if (processes.length === 0) {
            alert('Add some processes first');
            return;
        }
        let res;
        switch (algo.value) {
            case 'FCFS': res = fcfs(); break;
            case 'SJF': res = sjf(); break;
            case 'RR': res = rr(parseInt(quantum.value)); break;
            case 'Priority': res = priority(); break;
        }
        updateResults(res);
    }
    
    function fcfs() {
        let queue = [...processes].sort((a, b) => a.at - b.at);
        let time = 0, done = [], gantt = [];
        queue.forEach(p => {
            time = Math.max(time, p.at);
            let start = time;
            time += p.bt;
            done.push({ ...p, ct: time, tat: time - p.at, wt: time - p.at - p.bt });
            gantt.push({ id: p.id, start, end: time });
        });
        return { done, gantt, time };
    }
    
    function sjf() {
        let queue = [...processes];
        let time = 0, done = [], gantt = [];
        while (queue.length > 0) {
            let available = queue.filter(p => p.at <= time);
            if (available.length === 0) {
                time = Math.min(...queue.map(p => p.at));
                continue;
            }
            let job = available.reduce((a, b) => (a.bt < b.bt ? a : b));
            time += job.bt;
            done.push({ ...job, ct: time, tat: time - job.at, wt: time - job.at - job.bt });
            gantt.push({ id: job.id, start: time - job.bt, end: time });
            queue.splice(queue.indexOf(job), 1);
        }
        return { done, gantt, time };
    }
    
    function rr(quantum) {
        let queue = [...processes].map(p => ({ ...p, rt: p.bt }));
        let time = 0, done = [], gantt = [];
        while (queue.length > 0) {
            let p = queue.shift();
            let exec = Math.min(quantum, p.rt);
            let start = time;
            time += exec;
            p.rt -= exec;
            gantt.push({ id: p.id, start, end: time });
            if (p.rt > 0) queue.push(p);
            else done.push({ ...p, ct: time, tat: time - p.at, wt: time - p.at - p.bt });
        }
        return { done, gantt, time };
    }
    
    function priority() {
        let queue = [...processes];
        let time = 0, done = [], gantt = [];
        let order = document.getElementById('priorityDirectionGroup').value === 'low' ? 1 : -1;
        while (queue.length > 0) {
            let available = queue.filter(p => p.at <= time);
            if (available.length === 0) {
                time = Math.min(...queue.map(p => p.at));
                continue;
            }
            let job = available.reduce((a, b) => (a.prio * order < b.prio * order ? a : b));
            time += job.bt;
            done.push({ ...job, ct: time, tat: time - job.at, wt: time - job.at - job.bt });
            gantt.push({ id: job.id, start: time - job.bt, end: time });
            queue.splice(queue.indexOf(job), 1);
        }
        return { done, gantt, time };
    }
    
    function updateResults({ done, gantt, time }) {
        let tbody = results.querySelector('tbody');
        tbody.innerHTML = '';
        done.forEach(p => {
            let row = tbody.insertRow();
            [p.id, p.at, p.bt, p.prio, p.ct, p.wt, p.tat].forEach(val => {
                let cell = row.insertCell();
                cell.textContent = val;
            });
        });
    }
});
