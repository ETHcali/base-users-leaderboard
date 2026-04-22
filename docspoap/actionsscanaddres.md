/actions/scan/{address}
get
https://api.poap.tech/actions/scan/{address}

This endpoint returns a list of POAPs held by an address and the event details, token ID, chain, and owner address for each. A 200 status code with an empty list is returned when the address does not hold any POAPs. If you already know the event ID, you can use GET /actions/scan/{address}/{eventID} to check if an address holds that POAP. Note: For large collections of POAPs, it may take a while to load the artwork, since average size of the original artwork can be ~2MB per item (we allow upto 4MB). For solving this, we've developed a way to offer compressed artwork. To use this, you can request a smaller, lower resolution version of the image, simply append "?size=small" to the end of the image_url field value. For example, "https://poap.xyz/image.png?size=small". For more options with artwork sizes, you can also use extra small, small, medium, large, and extra large file sizes, in addition to the original size. xsmall = 64x64px small = 128x128px medium = 256x256px large = 512x512px xlarge = 1024x1024px

Recent Requests
Log in to see full request history
Time	Status	User Agent	
Make a request to see history.
0 Requests This Month

Path Params
address
string
required
The Ethereum address, ENS, or email.

Response

200
Success

Updated 10 months ago

/actions/scan/{address}/{eventId}
