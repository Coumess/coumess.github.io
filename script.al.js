import { Timeline } from './node_modules/vis-timeline/standalone/esm/vis-timeline-graph2d.js';
import { DataSet } from './node_modules/vis-data/peer/esm/vis-data.js';



document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById('visualization');

    if (!container) {
        console.error("Le conteneur de la timeline n'existe pas !");
        return;
    }

    var items = new DataSet([
        { id: 1, content: 'Naissance de Coumess', start: '2001-02-08' },
        { id: 2, content: 'Guerre de Cent Ans', start: '1337-05-24', end: '1453-10-09'},
        { id: 3, content: 'Test de Turing', start: '1950-10' },
        { id: 4, content: "Adoption du drapeau Népalais", start: '1962-12-16' },
    ]);

    var today = new Date().toISOString().split("T")[0];

    var options = {
        showCurrentTime: true,
        stack: true,
        stack: false,
        zoomable: true,
        editable: false,
        locale: 'fr',
        start: '1945-01-01',
        end: today,
    };


    var timeline = new Timeline(container, items, options);
});
