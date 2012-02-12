function normalizeMoney(value)
{
    var x = value.replace(/R\$ /g, '').replace(/\./g, '').replace(/,/g, '')
    return parseInt(x);
}

jQuery.fn.dataTableExt.oSort['money-asc'] = function(a, b) {
    return normalizeMoney(a) - normalizeMoney(b);
};

jQuery.fn.dataTableExt.oSort['money-desc'] = function(a, b) {
    return normalizeMoney(b) - normalizeMoney(a);
};

function handle_navigation (e)
{
    history.pushState(null, null, $(this)[0].href);
    view_from_url();
    e.preventDefault();
}

var popped = ('state' in window.history), initialURL = location.href;
function setup_history_handling()
{
    // Gracefully degrade.
    if (typeof history == "undefined" || typeof history.pushState == "undefined") {
        return;
    }

    window.addEventListener('popstate', function(e) {
        // Ignore initial pop =(.
        var initialPop = !popped && location.href == initialURL;
        popped = true;
        if (initialPop) return;

        view_from_url();
    });
}

function setup_navigation_handling(query)
{
    // Gracefully degrade.
    if (typeof history == "undefined" || typeof history.pushState == "undefined") {
        return;
    }

    $(query).click(handle_navigation);
}

function montanha_init()
{
    setup_history_handling();
    setup_navigation_handling('.navigation');

    view_from_url();
}

function cleanup() {
    var canvas = document.getElementById('graph');

    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    var table_title = document.getElementById('tabletitle');
    table_title.innerHTML = '';

    var details = document.getElementById('details');
    details.innerHTML = '';

    var graph_title = document.getElementById('graphtitle');
    graph_title.innerHTML = '';
    graph_title.parentNode.style.display = 'none';

    // Remove the labels too.
    var graphparent = document.getElementById('graphparent');
    var divs = $(graphparent).find('div');
    for (var i = 0; i < divs.length; i++) {
        graphparent.removeChild(divs[i]);
    }

    // Remove any left over from FixedHeader.
    try {
        var div = document.evaluate("//div[contains(@class, 'FixedHeader_Cloned')]", document, null, XPathResult.ANY_TYPE, null).iterateNext();
        div.parentNode.removeChild(div);
    } catch(e) {
    }
}

function build_table_top(columns) {
    // Now let's start building the new data display.
    var table = document.createElement('table');
    table.setAttribute('id', 'resultstable');

    var thead = document.createElement('thead');
    table.appendChild(thead)

    var tr = document.createElement('tr');
    thead.appendChild(tr);

    // First of all, the titles.
    for (var i = 0; i < columns.length; i++) {
        var col_label = columns[i]['label'];

        var th = document.createElement('th');
        th.innerHTML = col_label;
        tr.appendChild(th);
    }

    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Place new table in the DOM, replacing the old one.
    var results_pane = document.getElementById('results');
    if (results_pane.firstChild != null) {
        results_pane.replaceChild(table, results_pane.firstChild);
    } else {
        results_pane.appendChild(table);
    }

    return [table, tbody];
}

var main_title = undefined;
function set_title(title)
{
    if (main_title == undefined) {
        main_title = document.title;
    }

    document.title = title + ' - ' + main_title;
}

function view_from_url()
{
    // Set a good fallback.
    set_title('Totais por tipo de gasto');

    var pathname = window.location.pathname;
    if (pathname == '' || pathname == '/') {
        view('per_nature');
        return;
    }

    var components = pathname.split('/');

    // Remove the empty string.
    components.shift();

    var section = components.shift();

    var id = components.shift();
    if (id == "") id = undefined;

    if (section == 'legislador') {
        set_title('Totais por legislador');

        if (id == undefined) {
            view('per_legislator');
            return;
        }

        detail_legislator(id);
        return;
    }

    if (section == 'partido') {
        set_title('Totais por partido');
        view('per_party');
        return;
    }

    if (section == 'fornecedor') {
        set_title('Totais por fornecedor');
        view('per_supplier');
        return;
    }

    if (section == 'todos') {
        set_title('Todos os gastos');
        view_all();
        return;
    }

    view('per_nature');
}

function view_all() {
    cleanup();

    // Prepare columns we will display.
    var columns = []
    var n_columns = 0;

    var string_columns = ['Tipo de gasto', 'Deputad@', 'Partido',
                          'Empresa/Pessoa', 'CNPJ/CPF', 'N° do Doc.',
                          'Data']

    for (n_columns = 0; n_columns < string_columns.length; n_columns++) {
        var col = Object();
        col.label = string_columns[n_columns];
        col.type = 'string';
        columns[n_columns] = col;
    }

    var col = Object();
    col.label = 'Valor';
    col.type = 'money';
    columns[n_columns++] = col;

    // Build base table.
    var table_elements = build_table_top(columns);
    var table = table_elements[0];
    var tbody = table_elements[1];

    table.setAttribute('class', 'fullwidth');

    aoColumns = []
    for (var j = 0; j < columns.length; j++) {
        var coltype = columns[j]['type'];

        if (coltype == 'money') {
            aoColumns[j] = { sType: 'money' };
        } else {
            aoColumns[j] = null;
        }
    }

    var data_table = jQuery('#resultstable').dataTable({
        bPaginate: true,
	bProcessing: true,
	bServerSide: true,
	sAjaxSource: '/qserver/all',
        aoColumns: aoColumns,
        aaSorting: [[6, 'desc']]
    });

    new FixedHeader(data_table);
}

function detail_legislator(legid) {
    cleanup();

    $.getJSON('/qserver/legislator_info/' + legid, function(response) {
        var full_title = response.legname + ' (' + response.legparty + ')';
        set_title(full_title);

        var table_title = document.getElementById('tabletitle');
        table_title.innerHTML = full_title;
    });

    $.getJSON('/qserver/legislator_trivia/' + legid, function(response) {
        if (response.biggest_suppliers == undefined) {
            return;
        }

        var details = document.getElementById('details');
        var div = document.createElement('div');
        details.appendChild(div);

        var title = document.createElement('h2');
        title.innerHTML = 'Maiores fornecedores';
        div.appendChild(title);

        var list = document.createElement('ul');
        div.appendChild(list);

        for (var i = 0; i < response.biggest_suppliers.length; i++) {
            var supplier = response.biggest_suppliers[i];
            var item = document.createElement('li');
            item.innerHTML = supplier[0] + ' (' +
                jQuery().number_format(supplier[1], { symbol: 'R$' }) +
                ')';
            list.appendChild(item);
        }
    });

    // Prepare columns we will display.
    var columns = []
    var n_columns = 0;

    var string_columns = ['Tipo de gasto', 'Empresa/Pessoa',
                          'CNPJ/CPF', 'N° do Doc.', 'Data']

    for (n_columns = 0; n_columns < string_columns.length; n_columns++) {
        var col = Object();
        col.label = string_columns[n_columns];
        col.type = 'string';
        columns[n_columns] = col;
    }

    var col = Object();
    col.label = 'Valor';
    col.type = 'money';
    columns[n_columns++] = col;

    // Build base table.
    var table_elements = build_table_top(columns);
    var table = table_elements[0];
    var tbody = table_elements[1];

    table.setAttribute('class', 'fullwidth');

    aoColumns = []
    for (var j = 0; j < columns.length; j++) {
        var coltype = columns[j]['type'];

        if (coltype == 'money') {
            aoColumns[j] = { sType: 'money' };
        } else {
            aoColumns[j] = null;
        }
    }

    var data_table = jQuery('#resultstable').dataTable({
        bPaginate: true,
	bProcessing: true,
	bServerSide: true,
	sAjaxSource: '/qserver/legislator_all/' + legid,
        aoColumns: aoColumns,
        aaSorting: [[4, 'desc']]
    });

    new FixedHeader(data_table);
}

function view(url) {
    $.getJSON('/qserver/' + url, function(response) {
        var columns = response.columns
        var data = response.data;
        var show_graph = response.show_graph;
        var graph_column = response.graph_column;

        // First of all, cleanup the graph.
        cleanup();

        // Build base table.
        var table_elements = build_table_top(columns);
        var table = table_elements[0];
        var tbody = table_elements[1];

        // If we display a graph, we need to collect some information
        // to help us, and build the list of numbers to plot.
        if (show_graph) {
            // The last row is the total.
            var total = data[data.length - 1][graph_column];
            var graph_xticks = [];
            var graph_data = [];
            var graph_counter = 0;
            var other = 0;
        }

        // We leave the last one out, and deal with it afterwards!
        // This adds all of the data to the table.
        for (var i = 0; i < data.length - 1; i++) {
            tr = document.createElement('tr');
            tbody.appendChild(tr);

            if (i % 2 != 0) {
                tr.setAttribute('class', 'odd');
            }

            if (show_graph) {
                if ((data[i][graph_column] / total) > 0.05) {
                    graph_xticks[graph_counter] = {v: graph_counter, label: data[i][0]};
                    graph_data[graph_counter] = [graph_counter, data[i][graph_column]];
                    graph_counter++;
                } else { // Track too small to show slices.
                    other += data[i][graph_column];
                }
            }

            for (var j = 0; j < columns.length; j++) {
                var coltype = columns[j]['type'];
                var colindex = columns[j]['index'];

                td = document.createElement('td');

                if (coltype == 'money') {
                    td.setAttribute('class', 'right');
                    td.innerHTML = jQuery().number_format(data[i][colindex], { symbol: 'R$' });
                } else {
                    td.innerHTML = data[i][colindex];
                }

                tr.appendChild(td);
            }

        }

        var tfoot = document.createElement('tfoot');
        table.appendChild(tfoot);

        var tr = document.createElement('tr');
        tr.setAttribute('class', 'final');
        tfoot.appendChild(tr);

        for (var j = 0; j < columns.length; j++) {
            var last_line = data[data.length - 1];
            var skip_total = columns[j].skip_total;
            var coltype = columns[j]['type'];
            var colindex = columns[j]['index'];

            td = document.createElement('td');

            if (skip_total) {
                td.setAttribute('class', 'empty');
                tr.appendChild(td);
                continue;
            }

            if (coltype == 'money') {
                td.setAttribute('class', 'right');
                td.innerHTML = jQuery().number_format(data[i][colindex], { symbol: 'R$' });
            } else {
                td.innerHTML = data[i][colindex];
            }

            tr.appendChild(td);
        }

        // dataTable!
        aoColumns = []
        for (var j = 0; j < columns.length; j++) {
            var coltype = columns[j]['type'];

            if (coltype == 'money') {
                aoColumns[j] = { sType: 'money' };
            } else {
                aoColumns[j] = null;
            }
        }

        jQuery('#resultstable').dataTable({
            bPaginate: false,
            aoColumns: aoColumns,
            aaSorting: [[columns.length - 1, 'desc']]
        });

        setup_navigation_handling('#resultstable .navigation');

        // Graph.

        // No graph will be displayed - make sure the canvas is empty.
        if (!show_graph) {
            return;
        }

        var graph_title = document.getElementById('graphtitle');
        graph_title.parentNode.style.display = 'block';

        // Title the graph with the title of the graphed column.
        if (response.graph_title != undefined) {
            graph_title.innerHTML = response.graph_title;
        }

        // The "Other" slice of the pie.
        graph_xticks[graph_counter] = {v: graph_counter, label: 'Outros'};
        graph_data[graph_counter] = [graph_counter, other];

        var options = {
            'xTicks': graph_xticks,
            'drawBackground': false,
            'axisLabelWidth': '90',
            'axisLabelFontSize': 12,
        };

        var layout = new Layout('pie', options);
        layout.addDataset('expenses', graph_data);
        layout.evaluate();

        var canvas = document.getElementById('graph');
        var plotter = new PlotKit.SweetCanvasRenderer(canvas, layout, options);
        plotter.render();
    });
}
