$(document).ready(function() {
	$(".datepicker" ).datepicker();

    $('.cover .deleteNewRow').on('click.cover', function(){
          $(this).closest('tr').remove();
      });
	
	$('table').each(function(){ // for each table on the page, do the same
        // listAllCoupons(); // here we assume that the user is logged in. In fact we should check the loggin status here
		var tid = $(this).attr('id');
		$(this).editableTableWidget();
		attacheEvents(tid);
	});

    $(".add-empty").click(function(){
        // if($("#status").text() !== 'true'){
        //     $('#loggin').modal('show');
        //     return;
        // }
    	$(this).attr("disabled", true);
    	var tableID = $(this).attr("data-target");
        var newRow = createNewRow(tableID);
        $('#'+tableID+' tbody').append(newRow);
        $('#'+tableID).editableTableWidget(); // must call this again to apply the widget
        
        // we need to attach the event listeners below
        attacheEvents(tableID);
        
        $('#'+tableID+' .newRow .deleteNewRow').click(function(){
  		  $(this).closest('tr').remove();
  		  $('.add-empty[data-target='+tableID+']').removeAttr("disabled");
  	    });
        $('#'+tableID+' .newRow td').first().focus();
    });

    $("#today").text('Today is ' + moment().format('MM/DD/YYYY'));

    var $modal = $('#loading').modal({
        backdrop: 'static',
        show: false
      });

    $modal.on('shown.bs.modal', function (e) {
        $('#coupon tbody').fadeOut('slow', function(){
            // $(this).empty(); // somehow if we empty the table here it's actually empty things after the client data is added, which is not what we want.
        });
        
        $('#status').text('true');
        $('.add-empty').removeAttr('disabled');
        initializeAPI();
      });

    attachSortingEvent();

    setDefaultDateAndBackground();
  });

function setDefaultDateAndBackground(){
    var today = new Date();
    $('.date').each(function(index){
        var date = new Date();
        if(index < 3){
            if(index == 0){
                date.setDate(today.getDate() - 1);
            }else if(index == 1){
                date.setDate(today.getDate() + 5);
            }else{
                date.setDate(today.getDate() + 8);
            }
            var dateStr = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            $(this).find('input:first').datepicker('setDate', dateStr);
            $(this).attr('data-value', dateStr);
        }else{
            date = new Date(4000, 0, 1);
            $(this).attr('data-value', '01/01/4000');
        }
        var row = $(this).closest('tr');
        backgroundColorConfiguration(row, date, today);
    });
}

function attachSortingEvent(){
    $("th").click(function(){
        var name = $(this).attr('data-name');
        var order = $(this).attr('data-order');
        var inOrder = $(this).attr('data-inorder');
        if(inOrder !== 'none') {
            order = inOrder === 'asc' ? 'desc' : 'asc';
        }
        $(this).closest('tr').find('th').each(function(){
            $(this).attr('data-inorder', 'none');
        });
        $(this).attr('data-inorder', order);
        if(name === 'saving' || name === 'name'){
            // must use data-value as an attribute. otherwise it will not work. don't know why
            $('#coupon tbody tr').tsort('td[data-name='+name+']', {attr:'data-value', order: order, forceStrings: true});
        }else if(name === 'expiration'){
            $('#coupon tbody tr').tsort('td[data-name='+name+']', {attr:'data-value', sortFunction: function(a, b){
                // by looking at the chrome debugger we know that a.s and b.s are arrays
                // and if we provide order as an attribute, it will override the sort function, however we can use it
                // inside the function to guide the sorting order.
                    return order === 'asc' ? parseDate(a.s[0]) - parseDate(b.s[0]) : parseDate(b.s[0]) - parseDate(a.s[0]);
                }
            });
        }else{
            $('#coupon tbody tr').tsort('td[data-name='+name+']', {attr:'data-value', order: order});
        }
    });
}

var currencyFormat = {
    symbol: "$",
    precision: 2,
    thousand: ",",
    format: {
        pos : "%s%v",
        neg : "-%s%v"
    }
};

var numberFormat = {
    symbol: "",
    precision: 0,
    thousand: ",",
    format: {
        pos : "%s%v",
        neg : "-%s%v"
    }
};

var rateFormat = {
    symbol: "%",
    precision: 2,
    thousand: ",",
    format: {
        pos : "%v%s",
        neg : "-%v%s"
    }
};   

function attachExportEvent(){
    $("#export").click(function(){
        var data = [];
        $("#coupon tbody tr").each(function(){
            var coupon = [];
            $(this).find('td:not(.actions)').each(function(){
                if($(this).hasClass('date')){
                    coupon.push($(this).find('input').first().val().replace(',','_'));
                }else{
                    coupon.push($(this).html().replace(',','_'));
                }
            });
            data.push(coupon.join(','));
        });
        //http://stackoverflow.com/questions/17836273/export-javascript-data-to-csv-file-without-server-interaction
        var csvString = data.join('\n');
        var a = document.createElement('a');
        a.href     = 'data:attachment/csv,' + encodeURIComponent(csvString);
        a.target   = '_blank';
        a.download = 'myFile.csv';
        document.body.appendChild(a);
        a.click();
    });
}


function attacheEvents(tableID){
    $('table tbody').find('tr').first().find('td').first().focus();

    $('table tbody').find('tr').hover(function(){
        var backgroundColor = $(this).find('td').first().css('background-color');
        $(this).find('.datepicker').first().css('background-color', backgroundColor);
    });
    
	$("#"+tableID+' .datepicker').datepicker();
	
	$("#"+tableID+' .select').focus(function(){
        $(this).find("select")[0].focus();
    });

    $("#"+tableID+' .date').focus(function(){
        $(this).find("input")[0].focus();
    });
    
    $("#"+tableID+' .actions').focus(function(){
    	$(this).find("a")[0].focus();
    })

    $("#"+tableID+' td').on('validate', function(evt, newValue) {
      // here we should add proper validation for numbers and percentage
      if($(this).hasClass('currency')){
    	  if(!!newValue.match(/^[\$\-]+$/)) return false;
    	  var format1 = !!newValue.match(/(?=.)^\$?\-?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?$/);
    	  var format2 = !!newValue.match(/(?=.)^\-?\$?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?$/);
    	  return format1 || format2;
      }else if($(this).hasClass('rate')){
    	  if(!!newValue.match(/^[\$\-%]+$/)) return false;
    	  return !!newValue.match(/(?=.)^\-?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)?(\.[0-9]{0,2})?%?$/);
      }else if($(this).hasClass('numbers')){
          return !!newValue.match(/^(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)+$/) && !newValue.match(/^0+$/);
      }
      if ($(this).attr('data-name') !== 'saving' && newValue.length === 0) { 
        return false; // mark cell as invalid if any non-saving cell is empty
      }
    });

    $("#"+tableID+' td').on('change', function(evt, newValue) {
      // the validation is not firing for the datepicker so we have to do it here.
      // if($(this).hasClass('date')){
    	 //  var datepicker = $(this).find('input:first');
      //   if(datepicker.val()!==""){
      //       datepicker.removeClass('error');
      //   }else{
      //       $(this).focus();
      //       datepicker.addClass('error');
      //       return;
      //   }
      // }

      // for currency and percentage, change the display but save the real value in an attribute data-value
        if($(this).hasClass('currency')){
        	var value = accounting.unformat(newValue);
        	var formatedText = accounting.formatMoney(value,currencyFormat);
        	$(this).html(formatedText);
        	$(this).attr("data-value", value);
        }else if($(this).hasClass('rate')){
        	newValue = newValue.replace('%','');
        	var value = accounting.unformat(newValue);
        	var formatedText = accounting.formatMoney(value,rateFormat);
        	$(this).html(formatedText);
        	$(this).attr("data-value", value);
        }else if($(this).hasClass('numbers')){
            newValue = newValue.replace('%','');
            var value = accounting.unformat(newValue);
            var formatedText = accounting.formatMoney(value,numberFormat);
            $(this).html(formatedText);
            $(this).attr("data-value", value);
        }else if($(this).hasClass('string')){
            $(this).attr("data-value", newValue);
        }else if($(this).hasClass('date')){
            value = $(this).find('input:first').val();
            if(value === '') value = '01/01/4000';
            $(this).attr("data-value", value);
        }
    	
    	if($(this).closest('tr').hasClass('newRow')){
    		// check all cells. If they are all filled, post data to the server 
    		// if everything works out, remove the newRow class on the row
    		
    		var currentRow = $(this).closest('tr');
            // cell value validation
            var failed = currentRow.find('td:not(.actions)').filter(function(){
                var value;
                if($(this).hasClass('select')){
                    value = $(this).find('select:first').val();
                }else if($(this).hasClass('date')){
                    value = $(this).find('input:first').val();
                }else if($(this).hasClass('currency') || $(this).hasClass('rate')){
                    value = $(this).attr("data-value");
                }else{
                    value = $(this).html();
                }
                if(($(this).attr('data-name') !== 'saving' && $(this).attr('data-name') !== 'expiration') 
                    && (value === '' || value === undefined)) return true;
                return false;
            });

            if(failed.length > 0) return;

            var coupon = new Coupon();
            currentRow.find('td:not(.actions)').each(function(){
                var value;
                var data_name = $(this).attr('data-name');
                if($(this).hasClass('select')){
                    value = $(this).find('select:first').val();
                }else if($(this).hasClass('date')){
                    value = $(this).find('input:first').val();
                    if(value === '') value = '01/01/4000';
                }else if($(this).hasClass('currency') || $(this).hasClass('rate')){
                    value = $(this).attr("data-value");
                }else{
                    value = $(this).html();
                }
                coupon[data_name] = value;
            });

            // here we should replace it with the drive api function
            // assume that the user is authenticated
            gapi.client.load('drive', 'v2', function() {
                var request = gapi.client.request({
                    'path': '/drive/v2/files/',
                    'method': 'POST',
                    'body':{
                        "title" : "coupon_entry.csv",
                        "description" : JSON.stringify(coupon),
                        "mimeType" : 'text/csv', 
                        "parents": [{'id': 'appdata'}]
                    }
                });
                request.execute(function(resp) { 
                    console.log(resp); 
                    // gd_updateFile(resp.id, 'appdata', values.join('_MiaoMiao_'));
                    gd_updateFile(resp.id, 'appdata', JSON.stringify(coupon));

                    backgroundColorConfiguration(currentRow, parseDate(coupon.expiration), new Date())

                    currentRow.removeClass('newRow');
                    currentRow.find('td').each(function(){
                        $(this).attr('data-pk', resp.id);
                        $(this).closest('tr').attr('data-pk', resp.id);
                    });
                    $('.add-empty[data-target='+tableID+']').removeAttr("disabled");
                    
                    var deleteButton = '<a href="#" data-toggle="modal" data-target="#confirmDelete" data-title="Delete Coupon" data-id="'+resp.id+'" data-message="Are you sure you want to delete this coupon?"><span class="glyphicon glyphicon-trash"></span></a>';
                    var actionTD = currentRow.find('td.actions').first();
                    actionTD.empty();
                    actionTD.append(deleteButton);
                    // $('a[data-target='+tableID+']').focus(); // in case they need to add another
                });
            });
    	}else if(!$(this).closest('tr').hasClass('cover')){
            // replace with the drive api
            var coupon = new Coupon();
            var row = $(this).closest('tr');
            var id = row.attr('data-pk');
            
            row.find('td:not(.actions)').each(function(index){
                var data_name = $(this).attr('data-name'); 
                if($(this).hasClass('select')){
                    value = $(this).find('select:first').val();
                }else if($(this).hasClass('date')){
                    value = $(this).find('input:first').val();
                    if(value === '') value = '01/01/4000';
                    backgroundColorConfiguration(row, parseDate(value), new Date())
                }else{
                    value = $(this).attr("data-value");
                    if(!value) value = $(this).html();
                }
                $(this).attr("data-value", value);
                coupon[data_name] = value;
            });
            $('th').off('click');
            $('td').off('tsort');
            attachSortingEvent();
            // gd_updateFile(id, 'appdata', data.join('_MiaoMiao_'));
            gd_updateFile(id, 'appdata', JSON.stringify(coupon));
    	}
    });
    
    $('#confirmDelete').on('show.bs.modal', function (e) {
	      $message = $(e.relatedTarget).attr('data-message');
	      $(this).find('.modal-body p').text($message);
	      $title = $(e.relatedTarget).attr('data-title');
	      $(this).find('.modal-title').text($title);
	      
          $dataid = $(e.relatedTarget).attr('data-id');
	      $(this).find('.modal-footer #confirm').data('dataid', $dataid);
          var $row = $(e.relatedTarget).closest('tr');
          $(this).find('.modal-footer #confirm').data('datarow', $row);
	  });
	
	  // Form confirm (yes/ok) handler, submits form
	  $('#confirmDelete').find('.modal-footer #confirm').on('click', function(){
	    var couponid = $(this).data('dataid');
          // then we delete the file and close the modal
        if(couponid !== '' && couponid !== undefined){
            deleteFile(couponid, function(file){
                $('#coupon').find('tr[data-pk='+couponid+']').first().remove();
                $('#confirmDelete').modal('hide');
              });
        }else{
            $(this).data('datarow').remove();
            $('#confirmDelete').modal('hide');
        }
          
	  });
}

function createNewRow(tableID){
    var newRow = '<tr class="newRow">';
    if(tableID === 'coupon'){
        newRow += '<td class="numbers" data-name="number"></td>';
        newRow += '<td class="string" data-name="name"></td>';
        newRow += '<td class="string" data-name="saving"></td>';
        newRow += '<td class="date" data-name="expiration"><input type="text" class="datepicker" placeholder="Never Expire"></td>';
    } 
    newRow += '<td class="transparentBorder actions" data-editable="no">' +
    '<a href="#"><span class="glyphicon glyphicon-trash deleteNewRow"></span></a>'+ // must have href to enable the focus function
    '</td>';
    newRow += '</tr>';
    return newRow;
}

function appendNewRowWithData(data, dataid){
    var newRow = createNewRow('coupon');
    $('#coupon').find('tbody').append(newRow);
    newRow = $('#coupon').find('tr.newRow').first();
    // update the delete button
    var deleteButton = '<a href="#" data-toggle="modal" data-target="#confirmDelete" data-title="Delete Coupon" data-id="'+dataid+'" data-message="Are you sure you want to delete this coupon?"><span class="glyphicon glyphicon-trash"></span></a>';
    var actionTD = newRow.find('td.actions').first();
    actionTD.empty();
    actionTD.append(deleteButton);

    // update the data
    $(".datepicker" ).datepicker();
    newRow.attr('data-pk', dataid);
    newRow.find('td:not(.actions)').each(function(index){
        var data_name = $(this).attr('data-name');
        if(data_name === 'expiration'){
            if(data.expiration !== '01/01/4000'){
                $(this).find('input').first().datepicker('setDate', data.expiration);
            }
        }else{
            $(this).html(data[data_name]);
        }
        if($(this).hasClass('date')){
            if(data[index] !== '01/01/4000') $(this).attr("data-value", $(this).find('input:first').val());
            else{
                $(this).attr("data-value", '01/01/4000');
                $(this).find('input:first').attr('placeholder','Never Expire');
            }
        }else{
            $(this).attr("data-value", data[data_name]);
        }
    });
    newRow.removeClass('newRow');
    var expirationDate = parseDate(data.expiration);
    var today = new Date();

    backgroundColorConfiguration(newRow, expirationDate, today)
}

function parseDate(dateStr){
    var items = dateStr.split('/');
    var month = parseInt(items[0]),
        day = parseInt(items[1]),
        year = parseInt(items[2]);
    return new Date(year, month - 1, day);
}

function showProgressBar(){
      var $modal = $("#loading");
      $modal.modal('show');
}

function backgroundColorConfiguration(row, expirationDate, today){
    var dayDiff = Math.floor((expirationDate.getTime() - today.getTime())/(24*3600*1000));
    row.removeClass();
    if(dayDiff < 0){
        row.addClass('danger');
    }else if(dayDiff >=0 && dayDiff <= 7){
        row.addClass('warning');
    }
    var backgroundColor = row.find('td').first().css('background-color');
    row.find('.datepicker').first().css('background-color', backgroundColor);
}