document.addEventListener('DOMContentLoaded',()=>{
    let processList=[];
    const colors=['#4f46e5','#10b981','#8b5cf6','#f59e0b','#ec4899','#6366f1','#ef4444','#14b8a6'];
    const processTable=document.getElementById('processTable');
    const resultsTable = document.getElementById('resultsTable');
    const ganttChart = document.getElementById('ganttChart');
    const algorithmSelect = document.getElementById('algorithm');
    const quantumGroup = document.getElementById('quantumGroup');
    const priorityInput = document.getElementById('priority');
    const priorityg = document.getElementById('priorityDirectionGroup');
    const timeQuantum = document.getElementById('timeQuantum');
    document.getElementById('addProcess').addEventListener('click', addProcess);
    document.getElementById('calculate').addEventListener('click', calculate);
    document.getElementById('reset').addEventListener('click', resetSimulation);
    algorithmSelect.addEventListener('change', algooptions);
    function algooptions(){
        const isPriority =algorithmSelect.value==='Priority';
        const isRR =algorithmSelect.value==='RR';    
        quantumGroup.classList.toggle('hidden',!isRR);
        priorityg.classList.toggle('hidden',!isPriority);
        priorityInput.classList.toggle('hidden',!isPriority);
    }
    function addProcess() {
        const processID = document.getElementById('processID');
        const arrivalTime = document.getElementById('arrivalTime');
        const burstTime = document.getElementById('burstTime');
        const priority = document.getElementById('priority');
        if (!processID.value || !arrivalTime.value || !burstTime.value) {
            alert('Please fill in Process ID, Arrival Time, and Burst Time');
            return;
        }
        if (algorithmSelect.value === 'Priority' && !priority.value) {
            alert('Please enter a priority value for Priority Scheduling');
            return;
        }
        const process = {
            processID: parseInt(processID.value),
            arrivalTime: parseInt(arrivalTime.value),
            burstTime: parseInt(burstTime.value),
            priority: algorithmSelect.value === 'Priority' ? parseInt(priority.value) : 0
        };
        processList.push(process);
        updateProcessTable();
        clearInputs([processID, arrivalTime, burstTime, priority]);
    }
    function updateProcessTable() {
        const tbody = processTable.querySelector('tbody');
        tbody.innerHTML = '';   
        processList.forEach(process => {
            const row = tbody.insertRow();
            Object.values(process).forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });
        });
    }
    function clearInputs(inputs) {
        inputs.forEach(input => input.value = '');
    }
    function resetSimulation() {
        processList = [];
        updateProcessTable();
        resultsTable.querySelector('tbody').innerHTML = '';
        ganttChart.innerHTML = '';
        document.getElementById('avgTurnaroundTime').textContent = '0.00';
        document.getElementById('avgWaitingTime').textContent = '0.00';
    }
    function calculate() {
        if (processList.length === 0) {
            alert('Please add some processes first');
            return;
        }
        const algorithm = algorithmSelect.value;
        let results;
        switch (algorithm) {
            case 'FCFS':
                results = calculateFCFS();
                break;
            case 'SJF':
                results = calculateSJF();
                break;
            case 'RR':
                const quantum = parseInt(timeQuantum.value);
                if (!quantum || quantum <= 0) {
                    alert('Please enter a valid time quantum');
                    return;
                }
                results = calculateRR(quantum);
                break;
            case 'Priority':
                results = calculatePriority();
                break;
        }
        updateResults(results);
    }
    function calculateFCFS() {
        const processes = [...processList].sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        const completedProcesses = [];
        const ganttData = [];
        processes.forEach(process => {
            currentTime = Math.max(currentTime, process.arrivalTime);
            const startTime = currentTime;
            currentTime += process.burstTime;
            completedProcesses.push({
                ...process,
                completionTime: currentTime,
                turnaroundTime: currentTime - process.arrivalTime,
                waitingTime: currentTime - process.arrivalTime - process.burstTime
            });
            ganttData.push({ processID: process.processID, startTime, endTime: currentTime });
        });
        return { completedProcesses, ganttData, maxTime: currentTime };
    }
    function calculateSJF() {
        const processes = [...processList];
        let currentTime = 0;
        const completedProcesses = [];
        const ganttData = [];
        while (processes.length > 0) {
            const availableProcesses = processes.filter(p => p.arrivalTime <= currentTime);

            if (availableProcesses.length === 0) {
                currentTime = Math.min(...processes.map(p => p.arrivalTime));
                continue;
            }
            const shortestJob = availableProcesses.reduce((prev, curr) => 
                prev.burstTime < curr.burstTime ? prev : curr
            );
            const startTime = currentTime;
            currentTime += shortestJob.burstTime;
            completedProcesses.push({
                ...shortestJob,
                completionTime: currentTime,
                turnaroundTime: currentTime - shortestJob.arrivalTime,
                waitingTime: currentTime - shortestJob.arrivalTime - shortestJob.burstTime
            });
            ganttData.push({ processID: shortestJob.processID, startTime, endTime: currentTime });
            const index = processes.findIndex(p => p.processID === shortestJob.processID);
            processes.splice(index, 1);
        }
        return { completedProcesses, ganttData, maxTime: currentTime };
    }
    function calculateRR(quantum) {
        const processes = [...processList].map(p => ({ ...p, remainingTime: p.burstTime }));
        let currentTime = 0;
        const completedProcesses = [];
        const ganttData = [];
        while (processes.length > 0) {
            const process = processes.shift();
            if (process.arrivalTime > currentTime) {
                currentTime = process.arrivalTime;
            }
            const executeTime = Math.min(quantum, process.remainingTime);
            const startTime = currentTime;
            currentTime += executeTime;
            process.remainingTime -= executeTime;
            ganttData.push({ processID: process.processID, startTime, endTime: currentTime });
            if (process.remainingTime > 0) {
                processes.push(process);
            } else {
                completedProcesses.push({
                    ...process,
                    completionTime: currentTime,
                    turnaroundTime: currentTime - process.arrivalTime,
                    waitingTime: currentTime - process.arrivalTime - process.burstTime
                });
            }
        }
        return { completedProcesses, ganttData, maxTime: currentTime };
    }
    function calculatePriority() {
        const processes = [...processList];
        let currentTime = 0;
        const completedProcesses = [];
        const ganttData = [];
        const isLowPriorityHigh = priorityg.value === 'low';
        while (processes.length > 0) {
            const availableProcesses = processes.filter(p => p.arrivalTime <= currentTime);
            if (availableProcesses.length === 0) {
                currentTime = Math.min(...processes.map(p => p.arrivalTime));
                continue;
            }
            const highestPriorityJob = availableProcesses.reduce((prev, curr) => {
                if (isLowPriorityHigh) {
                    return prev.priority < curr.priority ? prev : curr;
                } else {
                    return prev.priority > curr.priority ? prev : curr;
                }
            });
            const startTime = currentTime;
            currentTime += highestPriorityJob.burstTime;
            completedProcesses.push({
                ...highestPriorityJob,
                completionTime: currentTime,
                turnaroundTime: currentTime - highestPriorityJob.arrivalTime,
                waitingTime: currentTime - highestPriorityJob.arrivalTime - highestPriorityJob.burstTime
            });
            ganttData.push({ processID: highestPriorityJob.processID, startTime, endTime: currentTime });
            const index = processes.findIndex(p => p.processID === highestPriorityJob.processID);
            processes.splice(index, 1);
        }
        return { completedProcesses, ganttData, maxTime: currentTime };
    }
    function updateResults({ completedProcesses, ganttData, maxTime }) {
        const tbody = resultsTable.querySelector('tbody');
        tbody.innerHTML = '';
        completedProcesses.forEach(process => {
            const row = tbody.insertRow();
            [
                process.processID,
                process.arrivalTime,
                process.burstTime,
                process.priority,
                process.completionTime,
                process.waitingTime,
                process.turnaroundTime
            ].forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });
        });
        const avgTurnaroundTime = completedProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) / completedProcesses.length;
        const avgWaitingTime = completedProcesses.reduce((sum, p) => sum + p.waitingTime, 0) / completedProcesses.length;
        document.getElementById('avgTurnaroundTime').textContent = avgTurnaroundTime.toFixed(2);
        document.getElementById('avgWaitingTime').textContent = avgWaitingTime.toFixed(2);
        updateGanttChart(ganttData, maxTime);
    }
    function updateGanttChart(ganttData, maxTime) {
        ganttChart.innerHTML = '';
        const timeline = document.createElement('div');
        timeline.className = 'timeline';
        for (let i = 0; i <= maxTime; i++) {
            const marker = document.createElement('span');
            marker.textContent = i;
            timeline.appendChild(marker);
        }
        ganttChart.appendChild(timeline);
        const chart = document.createElement('div');
        chart.className = 'gantt-chart';
        ganttData.forEach((process, index) => {
            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.backgroundColor = colors[process.processID % colors.length];
            bar.style.left = `${(process.startTime / maxTime) * 100}%`;
            bar.style.width = `${((process.endTime - process.startTime) / maxTime) * 100}%`;
            bar.textContent = `P${process.processID}`;
            chart.appendChild(bar);
        });
        ganttChart.appendChild(chart);
    }
    toggleAlgorithmOptions();
});

