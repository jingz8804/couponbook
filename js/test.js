$(document).ready(function() {
	$(".datepicker" ).datepicker();
	
	$('table').each(function(){ // for each table on the page, do the same
        // listAllCoupons(); // here we assume that the user is logged in. In fact we should check the loggin status here
		var tid = $(this).attr('id');
		$(this).editableTableWidget();
		attacheEvents(tid);
	});

    $(".add-empty").click(function(){
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
  });

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
      }
      if (newValue.length === 0 || newValue.length > 8) { 
        return false; // mark cell as invalid 
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
        	var formatedText = accounting.formatMoney(value,{
        		symbol: "$",
        		precision: 2,
        		thousand: ",",
        		format: {
        			pos : "%s%v",
        			neg : "-%s%v"
        		}
        	});
        	$(this).html(formatedText);
        	$(this).attr("data-value", value);
        }else if($(this).hasClass('rate')){
        	newValue = newValue.replace('%','');
        	var value = accounting.unformat(newValue);
        	var formatedText = accounting.formatMoney(value,{
        		symbol: "%",
        		precision: 2,
        		thousand: ",",
        		format: {
        			pos : "%v%s",
        			neg : "-%v%s"
        		}
        	});
        	$(this).html(formatedText);
        	$(this).attr("data-value", value);
        }
    	
        
        var completeLen;
        if(tableID === 'coupon'){
        	completeLen = 7;
        }
    	if($(this).closest('tr').hasClass('newRow')){
    		// check all cells. If they are all filled, post data to the server 
    		// if everything works out, remove the newRow class on the row
    		var values = [];
    		var currentRow = $(this).closest('tr');
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
    			if(value !== '' && value !== '1' && value !== undefined){
    				values.push(value);
    			}
    		});
    		if(values.length == completeLen){
    			var obj;
    			if(tableID == 'coupon'){
    				obj = {
        					description: values[0],
        					value: values[1],
        					contribution: values[2],
        					matching: values[3],
        					rate: values[4],
        					type: values[5],
        					allocation: values[6]
        			};
    			}
    			
                // here we should replace it with the drive api function
                // assume that the user is authenticated
                gapi.client.load('drive', 'v2', function() {
                    var request = gapi.client.request({
                        'path': '/drive/v2/files/',
                        'method': 'POST',
                        'body':{
                            "title" : "test.txt",
                            "description" : values.join(),
                            "parents": [{'id': 'appdata'}]
                        }
                    });
                    request.execute(function(resp) { 
                        console.log(resp); 
                        gd_updateFile(resp.id, 'appdata', values.join());

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
    		}
    	}else{
   //  		var name = $(this).attr('data-name');
   //  		var id = $(this).attr('data-pk');
   //  		var value;
			// if($(this).hasClass('select')){
			// 	value = $(this).find('select:first').val();
			// }else if($(this).hasClass('date')){
			// 	value = $(this).find('input:first').val();
			// }else{
			// 	value = $(this).attr("data-value");
			// 	if(!value) value = $(this).html();
			// }
   //  		var obj = {name: name, value: value, pk: id};
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
            gd_updateFile(id, 'appdata', data.join(','));
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
    if(tableID === 'coupon'){
    	newRow += '<td data-name="description"></td>';
        newRow += '<td class="currency" data-name="value"></td>';
        newRow += '<td class="currency" data-name="contribution"></td>';
        newRow += '<td class="currency" data-name="matching"></td>';
        newRow += '<td class="rate" data-name="rate"></td>';
        newRow += '<td class="select" data-name="type" data-editable="no"><select><option value="mercedes">Mercedes</option><option value="audi">Audi</option></select></td>';
        newRow += '<td class="select lastCell" data-name="allocation" data-editable="no"><select><option value="mercedes">Mercedes</option><option value="audi">Audi</option></select></td>';
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
    newRow.attr('data-pk', dataid);
    newRow.find('td').each(function(index){
        if($(this).hasClass('select')){
            $(this).find('select').first().val(data[index]);
        }else if($(this).hasClass('date')){
            $(this).find('input').first().datepicker('setDate', data[index]);
        }else{
            $(this).html(data[index]);
        }
    });
    newRow.removeClass('newRow');
}