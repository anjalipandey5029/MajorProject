const Listing = require('../models/listing');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geoCoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async(req,res) =>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
   };

module.exports.renderNewForm   = async(req,res) =>{
    res.render("listings/new.ejs")};

module.exports.showListing = async(req,res) =>{
    let {id} = req.params;
   const listing= await Listing.findById(id).populate({path : "reviews", populate : {
    path : "author",
   },
  }).populate("Owner");
   if(!listing){
    req.flash("error", "Listing does not exits!");
    res.redirect("/listings");
   }

   if (!listing.geometry || !listing.geometry.coordinates.length) {
    const response = await geocodingClient.forwardGeocode({
        query: listing.location,
        limit: 1,
    }).send();

    if (response.body.features.length > 0) {
        listing.geometry = response.body.features[0].geometry;
        await listing.save();
    }
}

   console.log(listing);
    res.render("listings/show.ejs",{listing});
   };
   
module.exports.createListing = async(req,res,next) =>{

 let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
      })
        .send();

    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.Owner = req.user._id;
    newListing.image = {url, filename};
    newListing.geometry = response.body.features[0].geometry;
  let savedListing =   await newListing.save();
  console.log(savedListing);
    req.flash("success", "New listing created");
    res.redirect("/listings");
};   

module.exports.renderEditForm = async(req,res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
     req.flash("error", "Listing does not exits!");
     res.redirect("/listings");
    }
   let originalImageUrl = listing.image.url;
   originalImageUrl=originalImageUrl.replace('/upload', '/upload/h_200,w_250,r_10');
   res.render('listings/edit.ejs', {listing, originalImageUrl});
   };

module.exports.updateListing = async(req,res) =>{
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});
    if( typeof req.file !== 'undefined'){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image =  {url, filename};
    await listing.save();
    }
    req.flash("success", "Listing Updated Successfully!");
    res.redirect("/listings");
};


module.exports.searchResult = async (req, res) => {
    const { country } = req.query;
    try {
        const listings = await Listing.find({ country: new RegExp(country, 'i') }).populate('reviews').populate('Owner');

        if (listings.length === 0) {
            req.flash("error", `No listings found for ${country}.`);
            return res.redirect('/listings'); // Redirect to the search page or another page
        }

        res.render('listings/searchResults', { listings, country, messages: req.flash() });

    } catch (error) {
        req.flash('error', 'An error occurred while fetching listings.');
        res.redirect('/listings');
    }
};



module.exports.destroyListing = async(req,res) =>{
    let {id} = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
};