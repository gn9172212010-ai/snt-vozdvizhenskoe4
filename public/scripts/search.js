const searchInput = document.getElementById("searchInput");

if (searchInput) {

searchInput.addEventListener("input", function(){

const value = this.value.toLowerCase();

const items = document.querySelectorAll(".search-item");

items.forEach(item=>{

const title = item.dataset.title;

const description = item.dataset.description;

if(

title.includes(value)

||

description.includes(value)

)

{

item.style.display="block";

}

else{

item.style.display="none";

}

});

});

}