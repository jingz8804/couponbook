$(document).ready(function() {
	$(".datepicker" ).datepicker();
	
	$('table').each(function(){ // for each table on the page, do the sam
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
    			// $.ajax({
    			// 	url: $('#'+tableID+'Save').attr('href'),
    			// 	data: obj,
    			// 	dataType: 'json',
    			// 	success: function(data){
    			// 		if(data['status'] === true) {
       //  					currentRow.removeClass('newRow');
       //  					currentRow.find('td').each(function(){
       //  						$(this).attr('data-pk', data['id']);
       //  					});
    			// 			$('.add-empty[data-target='+tableID+']').removeAttr("disabled");
    			// 			var deleteLink = $('#'+tableID+'DeleteLink').attr('href');
    			// 			var deleteButton = '<form action="' + deleteLink + '/' + data['id'] +'" method="post" style="display:inline"><input type="hidden" name="_method" value="DELETE" id="_method">' +
	      //          			'<a href="#" data-toggle="modal" data-target="#confirmDelete" data-title="Delete Assets" data-message="Are you sure you want to delete this asset?"><span class="glyphicon glyphicon-trash"></span></a>' +
	      //          			'</form>';
    			// 			var actionTD = currentRow.find('td.actions').first();
    			// 			actionTD.empty();
    			//             actionTD.append(deleteButton);
    			//             $('a[data-target='+tableID+']').focus(); // in case they need to add another
       //  				};
    			// 	}
    			// });
    		}
    	}else{
    		var name = $(this).attr('data-name');
    		var id = $(this).attr('data-pk');
    		var value;
			if($(this).hasClass('select')){
				value = $(this).find('select:first').val();
			}else if($(this).hasClass('date')){
				value = $(this).find('input:first').val();
			}else{
				value = $(this).attr("data-value");
				if(!value) value = $(this).html();
			}
    		var obj = {name: name, value: value, pk: id};
            // replace with the drive api
   //  		$.ajax({
			// 	url: $('#'+tableID+'Update').attr('href'),
			// 	data: obj,
			// 	dataType: 'json',
			// 	success: function(data){
			// 		if(data['status'] === true) {
						
   //  				};
			// 	}
			// });
    	}
    });
    
    $('#confirmDelete').on('show.bs.modal', function (e) {
	      $message = $(e.relatedTarget).attr('data-message');
	      $(this).find('.modal-body p').text($message);
	      $title = $(e.relatedTarget).attr('data-title');
	      $(this).find('.modal-title').text($title);
	
	      // Pass form reference to modal for submission on yes/ok
	      var form = $(e.relatedTarget).closest('form');
	      $(this).find('.modal-footer #confirm').data('form', form);
	  });
	
	  // Form confirm (yes/ok) handler, submits form
	  $('#confirmDelete').find('.modal-footer #confirm').on('click', function(){
	      $(this).data('form').submit();
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