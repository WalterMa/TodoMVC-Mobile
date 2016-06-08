/**
 * Created by Wentao on 2016/6/7.
 */

var CL_TODO = 'todo-item';
var CL_TODO_COMPLETED = 'todo-item-completed';
var CL_TODO_SELECTED = 'todo-item-selected';
var CL_FILTER_SELECTED = 'filter-tab-selected';
var CL_HIDE = 'hidden';


var $ = function(sel) {
    return document.querySelector(sel);
};
var $All = function(sel) {
    return document.querySelectorAll(sel);
};
var makeArray = function(likeArray) {
    var array = [];
    for (var i = 0; i < likeArray.length; ++i) {
        array.push(likeArray[i]);
    }
    return array;
};

function getUniqueId() {
    var dateTime = new Date();
    return 'ID'+dateTime.getTime().toString();
}

window.onload = function() {
    model.init(function(){

        Object.assign(model.data, {
            getItem: function (key) {
                if(key){
                    return this.items[key];
                }
                return null;
            },
            setItem: function (key, value) {
                if(key){
                    this.items[key] = value;
                }
            },
            removeItem: function (key) {
                if(key && key in this.items){
                    delete this.items[key];
                }
            }
        });

        var data = model.data;

        var newTodo = $('#add-todo-text');
        newTodo.addEventListener('keyup', function(ev) {
            data.msg = newTodo.value;

            if (ev.keyCode != 13) return; // Enter
            if (data.msg == '') {
                console.warn('input msg is empty');
            }else {
                data.setItem(getUniqueId(), {msg:data.msg, completed:false});
                data.msg = '';
                update();
            }
        }, false);

        var addTodoButton = $('#add-todo-button');
        addTodoButton.addEventListener('click', function() {
            if (data.msg == '') {
                console.warn('input msg is empty');
            }else {
                data.setItem(getUniqueId(), {msg:data.msg, completed:false});
                data.msg = '';
                update();
            }
        }, false);

        var selectAll = $('#select-all-button');
        selectAll.addEventListener('change', function() {
            if (!selectAll.checked){
                $('#bottom-menu-bar').classList.add(CL_HIDE);
            }
            makeArray($All('.' + CL_TODO + ':not(.hidden)')).forEach(function (item, index) {
                    if (selectAll.checked){
                        item.classList.add(CL_TODO_SELECTED);
                    }else {
                        item.classList.remove(CL_TODO_SELECTED);
                    }
                }
            );
        }, false);

        var toggleComplete= $('#toggle-complete-button');
        toggleComplete.addEventListener('click', function() {
            makeArray($All('.' + CL_TODO_SELECTED + ':not(.hidden)')).forEach(function (item, index) {
                    data.getItem(item.id).completed = !data.getItem(item.id).completed;
                }
            );
            update();
        }, false);
        
        var removeSelected= $('#remove-selected-button');
        removeSelected.addEventListener('click', function() {
            makeArray($All('.' + CL_TODO_SELECTED + ':not(.hidden)')).forEach(function (item, index) {
                    // removeTodo(item);
                    data.getItem(item.id).msg = '';
                }
            );
            update();
        }, false);

        var filters = makeArray($All('#filter-bar li'));
        filters.forEach(function(filter) {
            if (filter.innerHTML === data.filter) {
                filter.classList.add(CL_FILTER_SELECTED);
            }else {
                filter.classList.remove(CL_FILTER_SELECTED);
            }
            filter.addEventListener('click', function() {
                data.filter = filter.innerHTML;
                filters.forEach(function(filter) {
                    filter.classList.remove(CL_FILTER_SELECTED);
                });
                filter.classList.add(CL_FILTER_SELECTED);
                data.filter = filter.innerHTML;
                update();
            }, false);
        });

        var editTodoDialog = $('#edit-todo-dialog');
        editTodoDialog.onclick = function (e) {
            e.stopPropagation();
        };

        var todoList = $('#todo-list');
        todoList.addEventListener('animationend', updateBottomBar);

        update();
    });
};

function update() {
    var data = model.data;
    var newTodo = $('#add-todo-text');
    newTodo.value = data.msg;
    var keys = [];
    for (var itemId in data.items){
        if (data.items.hasOwnProperty(itemId)) {
            keys.push(itemId);
        }
    }
    keys = keys.sort();
    keys.forEach(function (itemId) {
        var itemDOM = document.getElementById(itemId);
        var itemObj = data.getItem(itemId);
        if (itemDOM){
            if(itemObj.msg === ''){
                data.removeItem(itemId);
                removeTodo(itemDOM);
                return;
            }else {
                if (itemDOM.innerHTML != itemObj.msg){
                    itemDOM.innerHTML = itemObj.msg;
                }
                if (itemDOM.classList.contains(CL_TODO_COMPLETED) != itemObj.completed){
                    itemDOM.classList.toggle(CL_TODO_COMPLETED);
                }
            }
        }else{
            itemDOM = addTodo(itemId, itemObj.msg, itemObj.completed);
        }
        var completed = itemDOM.classList.contains(CL_TODO_COMPLETED);
        if (data.filter == 'All'
            || (data.filter == 'Active' && !completed)
            || (data.filter == 'Completed' && completed)){
            showTodo(itemDOM);
        }else {
            hideTodo(itemDOM);
        }
    });

    updateBottomBar();

    model.flush();

}

function updateBottomBar() {
    var selectedItem = $All('.'+CL_TODO_SELECTED + ':not(.hidden)');
    var selectButton = $('#select-all-button');
    var allShowItem = $All('.' + CL_TODO + ':not(.hidden)');
    var bottomBar = $('#bottom-menu-bar');
    if(selectedItem.length == 0){
        if(!bottomBar.classList.contains(CL_HIDE)){
            bottomBar.style.animation = 'hide-menu-bar 0.3s';
            bottomBar.addEventListener("animationend", function listener() {
                bottomBar.removeEventListener('animationend', listener);
                bottomBar.classList.add(CL_HIDE);
                bottomBar.style.animation = 'show-menu-bar 0.3s';
            });
        }
        selectButton.checked = false;
    }else {
        bottomBar.classList.remove(CL_HIDE);
        selectButton.checked = (selectedItem.length == allShowItem.length);
    }
}

function addTodo(id, msg, completed) {
    var item = document.createElement('li');
    item.setAttribute('id', id);
    item.classList.add(CL_TODO);
    if (completed){
        item.classList.add(CL_TODO_COMPLETED);
    }

    //Tap, Long Tap and swipe Event
    var longTapTimer;
    var startX, startY, moveX, moveY;
    var removed = false;
    item.addEventListener('touchstart', function (e) {
        var item = e.target;
        var touch = e.touches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        longTapTimer = setTimeout(function () {
            editTodo(item);
            longTapTimer = null;
        }, 500);
    });
    item.addEventListener('touchend', function (e) {
        var item = e.target;
        if(longTapTimer != null){
            clearTimeout(longTapTimer);
            longTapTimer = null;
            selectTodo(item);
        }
        if (Math.abs(moveX) > 200 && !removed){
            removed = true;
            model.data.getItem(item.id).msg = '';
            update();
        }else if(!removed) {
            item.style.transform = 'translate(' + 0 + 'px, ' + 0 + 'px)';
            item.style.opacity = 1 ;
        }

    });
    item.addEventListener('touchmove', function (e) {
        var touch = e.touches[0];
        var item = e.target;

        moveX = touch.pageX - startX;
        moveY = touch.pageY - startY;

        if((Math.abs(moveX) > 5 || Math.abs(moveY) > 5) && longTapTimer != null){
            clearTimeout(longTapTimer);
            longTapTimer = null;
        }

        if(Math.abs(moveY) < 10){
            e.preventDefault();
            item.style.transform = 'translate(' + moveX + 'px, ' + 0 + 'px)';
            item.style.opacity = (1 - Math.abs(moveX) / 300).toFixed(1);
        }
    });


    item.innerHTML = msg;

    var todoList = $('#todo-list');
    todoList.insertBefore(item, todoList.firstChild);

    return item;
}

function removeTodo(todoItem) {
    todoItem.style.animation = 'delete-item 0.4s';
    todoItem.addEventListener("animationend", function listener() {
        todoItem.removeEventListener('animationend', listener);
        todoItem.parentNode.removeChild(todoItem);
    },false);
}

function hideTodo(todoItem) {
    if(!todoItem.classList.contains(CL_HIDE)){
        todoItem.style.animation = 'delete-item 0.4s';
        todoItem.addEventListener("animationend", function listener() {
            todoItem.removeEventListener('animationend', listener);
            todoItem.classList.add(CL_HIDE);
        },false);
    }
}

function showTodo(todoItem) {
    todoItem.classList.remove(CL_HIDE);
    todoItem.style.animation = 'add-item 0.4s';
}

function editTodo(todoItem) {
    var data = model.data;
    var editTodo = $('#edit-todo');
    var editTodoText = $('#edit-todo-text');
    var acceptButton = $('#accept-edit-button');
    var cancelButton = $('#cancel-edit-button');

    editTodoText.value = todoItem.innerHTML;

    editTodo.onclick = function () {
        data.getItem(todoItem.id).msg = editTodoText.value;
        editTodo.classList.add(CL_HIDE);
        update();
    };

    acceptButton.onclick = function (e) {
        data.getItem(todoItem.id).msg = editTodoText.value;
        editTodo.classList.add(CL_HIDE);
        update();
        e.stopPropagation();
    };
    cancelButton.onclick = function (e) {
        editTodo.classList.add(CL_HIDE);
        e.stopPropagation();
    };
    editTodo.classList.remove(CL_HIDE);
}

function selectTodo(item) {

    if (item.classList.contains(CL_TODO_SELECTED)){
        item.classList.remove(CL_TODO_SELECTED);
    }else {
        item.classList.add(CL_TODO_SELECTED);
    }
    update();
}

window.onunload = function () {
    model.flush();
};