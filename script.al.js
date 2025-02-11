import { Timeline } from './node_modules/vis-timeline/standalone/esm/vis-timeline-graph2d.js';
import { DataSet } from './node_modules/vis-data/peer/esm/vis-data.js';



document.addEventListener("DOMContentLoaded", function () {
    var container = document.getElementById('visualization');

    if (!container) {
        console.error("Le conteneur de la timeline n'existe pas !");
        return;
    }

    var items = new DataSet([
        { 
            id: 1, 
            content: 'Naissance de Coumess', 
            start: '2001-02-08',
            description: "Naissance d'une personne simple.",
        },
        { 
            id: 2, 
            content: 'Guerre de Cent Ans', 
            start: '1337-05-24', 
            end: '1453-10-09',
            description: "Série de conflits opposant le royaume d'Angleterre et le royaume de France. Malgré son nom, elle a duré 116 ans.",
        },
        { 
            id: 3, 
            content: 'Test de Turing', 
            start: '1950-10',
            description: "Test proposé par Alan Turing pour évaluer la capacité d'une machine à imiter une conversation humaine."
        },
        { 
            id: 4, 
            content: "Adoption du drapeau Népalais", 
            start: '1962-12-16',
            className: 'decade-only',
            description: "Adoption officielle du seul drapeau national non rectangulaire au monde."
        }
    ]);

    var today = new Date().toISOString().split("T")[0];
    
    var options = { 
        showCurrentTime: true,
        stack: true,
        stack: false,
        zoomable: true,
        editable: false,
        locale: 'fr',
        start: '1300-01-01',
        end: today,
        min: new Date(-600, 0, 1),
        max: new Date(2048, 0, 1),
    };


    var timeline = new Timeline(container, items, options);

    // Ajouter l'événement de clic
    timeline.on('select', function(properties) {
        const eventDetails = document.getElementById('event-details');
        if (properties.items.length > 0) {
            const selectedItem = items.get(properties.items[0]);
            if (selectedItem.description) {
                eventDetails.innerHTML = `
                    <h3>${selectedItem.content}</h3>
                    ${selectedItem.image ? `<img src="${selectedItem.image}" alt="${selectedItem.content}" style="max-width: 300px; margin: 10px 0;">` : ''}
                    <p>${selectedItem.description}</p>
                `;
                eventDetails.style.display = 'block';
            }
        } else {
            eventDetails.style.display = 'none';
        }
    });
});
