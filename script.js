document.addEventListener('DOMContentLoaded', () => {
    //Initialize icons
    lucide.createIcons();
    let processes = [];
    //Colors for the Gantt chart
    const colors = ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6'];
    const process_table = document.getElementById('processTable');
    const results_table = document.getElementById('resultsTable');
    const gantt_chart = document.getElementById('ganttChart');
    const algorithm_select = document.getElementById('algorithm');
    const quantum_group = document.getElementById('quantumGroup');
    const priority_input = document.getElementById('priority');
    const priority_group = document.getElementById('priorityDirectionGroup');
    const time_quantum = document.getElementById('timeQuantum');
    //Set up event listeners
    document.getElementById('addProcess').addEventListener('click', add_process);
    document.getElementById('calculate').addEventListener('click', run_calculations);
    document.getElementById('reset').addEventListener('click', reset_all);
    algorithm_select.addEventListener('change', update_algorithm_options);
    //show/hide options based on selected algorithm
    function update_algorithm_options() {
        const is_priority = algorithm_select.value === 'Priority';
        const is_rr = algorithm_select.value === 'RR';
        quantum_group.classList.toggle('hidden', !is_rr);
        priority_group.classList.toggle('hidden', !is_priority);
        priority_input.classList.toggle('hidden', !is_priority);
    }
    function add_process() {
        const process_id = document.getElementById('processID');
        const arrival_time = document.getElementById('arrivalTime');
        const burst_time = document.getElementById('burstTime');
        const priority = document.getElementById('priority');
        if (!process_id.value || !arrival_time.value || !burst_time.value) {
            alert('Please fill in all required fields');
            return;
        }
        if (algorithm_select.value === 'Priority' && !priority.value) {
            alert('Please enter a priority value');
            return;
        }
        //Create the process object
        const new_process = {
            id: parseInt(process_id.value),
            arrival: parseInt(arrival_time.value),
            burst: parseInt(burst_time.value),
            priority: algorithm_select.value === 'Priority' ? parseInt(priority.value) : 0
        };
        // Add to our list and update the display
        processes.push(new_process);
        update_process_table();
        process_id.value = '';
        arrival_time.value = '';
        burst_time.value = '';
        priority.value = '';
    }
    function update_process_table() {
        const table_body = process_table.querySelector('tbody');
        table_body.innerHTML = '';
        processes.forEach(process => {
            const row = table_body.insertRow();
            const cells = [
                process.id,
                process.arrival,
                process.burst,
                process.priority
            ];            
            cells.forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });
        });
    }
    function reset_all() {
        processes = [];
        update_process_table();
        results_table.querySelector('tbody').innerHTML = '';
        gantt_chart.innerHTML = '';
        document.getElementById('avgTurnaroundTime').textContent = '0.00';
        document.getElementById('avgWaitingTime').textContent = '0.00';
    }
    function run_calculations() {
        if (processes.length === 0) {
            alert('Please add some processes first');
            return;
        }
        let results;
        const algorithm = algorithm_select.value;
        switch (algorithm) {
            case 'FCFS':
                results = first_come_first_serve();
                break;
            case 'SJF':
                results = shortest_job_first();
                break;
            case 'RR':
                const quantum = parseInt(time_quantum.value);
                if (!quantum || quantum <= 0) {
                    alert('Please enter a valid time quantum');
                    return;
                }
                results = round_robin(quantum);
                break;
            case 'Priority':
                results = priority_scheduling();
                break;
        }
        show_results(results);
    }
    //FCFS algorithm implementation
    function first_come_first_serve() {
        // Sort by arrival time
        const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
        let current_time = 0;
        const finished = [];
        const gantt = [];
        sorted.forEach(process => {
            // Wait until process arrives if needed
            current_time = Math.max(current_time, process.arrival);
            const start = current_time;
            current_time += process.burst;
            finished.push({
                ...process,
                finish: current_time,
                turnaround: current_time - process.arrival,
                waiting: current_time - process.arrival - process.burst
            });
            gantt.push({
                id: process.id,
                start: start,
                end: current_time
            });
        });
        return {
            processes: finished,
            gantt: gantt,
            total_time: current_time
        };
    }
    //SJF algorithm implementation
    function shortest_job_first() {
        const remaining = [...processes];
        let current_time = 0;
        const finished = [];
        const gantt = [];
        while (remaining.length > 0) {
            const available = remaining.filter(p => p.arrival <= current_time);
            if (available.length === 0) {
                // Jump to next arrival time if nothing is available
                current_time = Math.min(...remaining.map(p => p.arrival));
                continue;
            }
                const shortest = available.reduce((prev, curr) => 
                prev.burst < curr.burst ? prev : curr
            );
            const start = current_time;
            current_time += shortest.burst;
            finished.push({
                ...shortest,
                finish: current_time,
                turnaround: current_time - shortest.arrival,
                waiting: current_time - shortest.arrival - shortest.burst
            });
            gantt.push({
                id: shortest.id,
                start: start,
                end: current_time
            });
            remaining.splice(remaining.findIndex(p => p.id === shortest.id), 1);
        }
        return {
            processes: finished,
            gantt: gantt,
            total_time: current_time
        };
    }
function round_robin(quantum) {
    // Create a copy with remaining time
    const queue = [...processes].map(p => ({ 
        ...p, 
        remaining: p.burst 
    }));
    let current_time = 0;
    const finished = [];
    const gantt = [];
    while (queue.length > 0) {
        const process = queue.shift();
        if (process.arrival > current_time) {
            // If nothing is running, create an empty space
            if (queue.length > 0) {
                gantt.push({
                    id: null,  // Indicates empty space
                    start: current_time,
                    end: process.arrival
                });
            }
            current_time = process.arrival;
        }
        const execute_time = Math.min(quantum, process.remaining);
        const start = current_time;
        current_time += execute_time;
        process.remaining -= execute_time;
        gantt.push({
            id: process.id,
            start: start,
            end: current_time
        });
        if (process.remaining > 0){
            // Put back in queue if not finished
            queue.push(process);
        }else {
            // Add to finished list
            finished.push({
                ...process,
                finish: current_time,
                turnaround: current_time - process.arrival,
                waiting: current_time - process.arrival - process.burst
            });
        }
    }
    return {
        processes: finished,
        gantt: gantt,
        total_time: current_time
    };
}
    function priority_scheduling() {
        const remaining = [...processes];
        let current_time = 0;
        const finished = [];
        const gantt = [];
        const high_priority_first = priority_group.value === 'high';
        while (remaining.length > 0) {
            const available = remaining.filter(p => p.arrival <= current_time);
            if (available.length === 0) {
                // Jump to next arrival time if needed
                current_time = Math.min(...remaining.map(p => p.arrival));
                continue;
            }
            const highest_priority = available.reduce((prev, curr) => {
                if (high_priority_first) {
                    return prev.priority > curr.priority ? prev : curr;
                } else {
                    return prev.priority < curr.priority ? prev : curr;
                }
            });
            const start = current_time;
            current_time += highest_priority.burst;
            finished.push({
                ...highest_priority,
                finish: current_time,
                turnaround: current_time - highest_priority.arrival,
                waiting: current_time - highest_priority.arrival - highest_priority.burst
            });
            gantt.push({
                id: highest_priority.id,
                start: start,
                end: current_time
            });
            remaining.splice(remaining.findIndex(p => p.id === highest_priority.id), 1);
        }
        return {
            processes: finished,
            gantt: gantt,
            total_time: current_time
        };
    }
    function show_results(results) {
        const table_body = results_table.querySelector('tbody');
        table_body.innerHTML = '';

        // Add each process to results table
        results.processes.forEach(process => {
            const row = table_body.insertRow();
            
            const cells = [
                process.id,
                process.arrival,
                process.burst,
                process.priority,
                process.finish,
                process.waiting,
                process.turnaround
            ];
            
            cells.forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });
        });
        const avg_turnaround = results.processes.reduce((sum, p) => sum + p.turnaround, 0) / results.processes.length;
        const avg_waiting = results.processes.reduce((sum, p) => sum + p.waiting, 0) / results.processes.length;
        // Update average displays
        document.getElementById('avgTurnaroundTime').textContent = avg_turnaround.toFixed(2);
        document.getElementById('avgWaitingTime').textContent = avg_waiting.toFixed(2);
        // Draw the Gantt chart
        draw_gantt(results.gantt, results.total_time);
    }
    // Create the Gantt chart visualization
    function draw_gantt(gantt_data, total_time) {
    gantt_chart.innerHTML = '';
    
    // Create timeline markers
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    for (let i = 0; i <= total_time; i++) {
        const marker = document.createElement('span');
        marker.textContent = i;
        timeline.appendChild(marker);
    }
    gantt_chart.appendChild(timeline);
    const chart = document.createElement('div');
    chart.className = 'gantt-chart';
    gantt_data.forEach(item => {
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        if (item.id === null) {
            // Empty space (idle CPU)
            bar.style.backgroundColor = '#e5e7eb';
            bar.textContent = 'Idle';
        } else {
            bar.style.backgroundColor = colors[item.id % colors.length];
            bar.textContent = `P${item.id}`;
        } 
        bar.style.left = `${(item.start / total_time) * 100}%`;
        bar.style.width = `${((item.end - item.start) / total_time) * 100}%`;
        chart.appendChild(bar);
    });
    gantt_chart.appendChild(chart);
}
    update_algorithm_options();
});
