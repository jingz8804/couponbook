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
        if($("#status").text() !== 'true'){
            $('#loggin').modal('show');
            return;
        }
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
    });

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
        $('#login').fadeOut('slow', function(){
            $(this).text("Export All").fadeIn();
            $(this).attr('id', 'export');
            attachExportEvent();
        });
        $('#welcome_text').fadeOut('slow', function(){
            $(this).text('CouponBook helps you keep track of your coupons. Click the button below to export all your coupons.').fadeIn();
        });
        initializeAPI();
      });

    $("th").click(function(){
        var name = $(this).attr('data-name');
        var order = $(this).attr('data-order');
        var reversed = order === 'asc' ? 'desc' : 'asc';
        $('#coupon tbody tr').tsort('td[data-name='+name+']', {data:'value', order: order});
        $(this).attr('data-order', reversed);
    });
  });

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
        if($("#status").text() !== 'true'){
            $('#loggin').modal('show');
            return;
        }
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
        var csvString = data.join('\n');
        var a = document.createElement('a');
        a.href     = 'data:attachment/csv,' + csvString;
        a.target   = '_blank';
        a.download = 'myFile.csv';
        document.body.appendChild(a);
        a.click();
    });
}


function attacheEvents(tableID){
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
        return !!newValue.match(/^(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+)+$/);
      }
      if ($(this).attr('data-name') !== 'saving' && newValue.length === 0) { 
        return false; // mark cell as invalid if any non-saving cell is empty
      }
    });

    $("#"+tableID+' td').on('change', function(evt, newValue) {
      // the validation is not firing for the datepicker so we have to do it here.
      if($(this).hasClass('date')){
    	  var datepicker = $(this).find('input:first');
        if(datepicker.val()!==""){
            datepicker.removeClass('error');
        }else{
            $(this).focus();
            datepicker.addClass('error');
            return;
        }
      }

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
                if($(this).attr('data-name') !== 'saving' && (value === '' || value === undefined)) return true;
                return false;
            });

            if(failed.length > 0) return;

            // validation completed, retrieve value
            var values = [];
            currentRow.find('td:not(.actions)').each(function(){
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
                values.push(value);
            });

            // here we should replace it with the drive api function
            // assume that the user is authenticated
            gapi.client.load('drive', 'v2', function() {
                var request = gapi.client.request({
                    'path': '/drive/v2/files/',
                    'method': 'POST',
                    'body':{
                        "title" : "coupon_entry.csv",
                        "description" : values.join('_MiaoMiao_'),
                        "mimeType" : 'text/csv', 
                        "parents": [{'id': 'appdata'}]
                    }
                });
                request.execute(function(resp) { 
                    console.log(resp); 
                    gd_updateFile(resp.id, 'appdata', values.join('_MiaoMiao_'));

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
                    $('a[data-target='+tableID+']').focus(); // in case they need to add another
                });
            });
    	}else if(!$(this).closest('tr').hasClass('cover')){
            // replace with the drive api
            var row = $(this).closest('tr');
            var id = row.attr('data-pk');
            var data = [];
            row.find('td:not(.actions)').each(function(index){
                if($(this).hasClass('select')){
                    value = $(this).find('select:first').val();
                }else if($(this).hasClass('date')){
                    value = $(this).find('input:first').val();
                }else{
                    value = $(this).attr("data-value");
                    if(!value) value = $(this).html();
                }
                data.push(value);
            });
            gd_updateFile(id, 'appdata', data.join('_MiaoMiao_'));
    	}
    });
    
    $('#confirmDelete').on('show.bs.modal', function (e) {
	      $message = $(e.relatedTarget).attr('data-message');
	      $(this).find('.modal-body p').text($message);
	      $title = $(e.relatedTarget).attr('data-title');
	      $(this).find('.modal-title').text($title);
	      
          $dataid = $(e.relatedTarget).attr('data-id');
	      $(this).find('.modal-footer #confirm').data('dataid', $dataid);
	  });
	
	  // Form confirm (yes/ok) handler, submits form
	  $('#confirmDelete').find('.modal-footer #confirm').on('click', function(){
	      var couponid = $(this).data('dataid');
          // then we delete the file and close the modal
          deleteFile(couponid, function(file){
            $('#coupon').find('tr[data-pk='+couponid+']').first().remove();
            $('#confirmDelete').modal('hide');
          });
	  });
}

function createNewRow(tableID){
    var newRow = '<tr class="newRow">';
    // if(tableID === 'coupon'){
    // 	newRow += '<td data-name="description"></td>';
    //     newRow += '<td class="numbers" data-name="amount"></td>';
    //     newRow += '<td class="string" data-name="saving"></td>';
    //     newRow += '<td class="date" data-name="expiration"><input type="text" class="datepicker" placeholder="expiration date"></td>';
    // }
    if(tableID === 'coupon'){
        newRow += '<td class="numbers" data-name="number"></td>';
        newRow += '<td class="string" data-name="saving"></td>';
        newRow += '<td class="string" data-name="name"></td>';
        newRow += '<td class="date" data-name="expiration"><input type="text" class="datepicker" placeholder="expiration date"></td>';
    }
//    newRow += '<td class="date" data-name="date"><input type="text" class="datepicker" placeholder="date of birth"></td>'; 
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
        if($(this).hasClass('select')){
            $(this).find('select').first().val(data[index]);
        }else if($(this).hasClass('date')){
            $(this).find('input').first().datepicker('setDate', data[index]);
        }else if($(this).hasClass('currency')){
            var formatedText = accounting.formatMoney(data[index],currencyFormat);
            $(this).html(formatedText);
            $(this).attr("data-value", data[index]);
        }else if($(this).hasClass('rate')){
            var formatedText = accounting.formatMoney(data[index],rateFormat);
            $(this).html(formatedText);
            $(this).attr("data-value", data[index]);
        }else{
            $(this).html(data[index]);
        }
    });
    newRow.removeClass('newRow');
    var expirationDate = data[3];
    var today = new Date();
    var dayDiff = Math.floor((expirationDate.getTime() - today.getTime())/(24*3600*1000));
    if(dayDiff <= 3){
        newRow.addClass('danger');
    }else if(dayDiff > 3 && dayDiff <= 7){
        newRow.addClass('warning');
    }
    var backgroundColor = newRow.find('td').first().css('background-color');
    newRow.find('.datepicker').first().css('background-color', backgroundColor);
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