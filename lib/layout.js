/*
	The Cedric's Swiss Knife (CSK) - CSK terminal toolbox
	
	Copyright (c) 2009 - 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/



// Load modules
var boxes = require( './spChars.js' ).box ;
var events = require( 'events' ) ;



function Layout() { throw new Error( 'Use Layout.create() instead' ) ; }
Layout.prototype = Object.create( events.prototype ) ;
Layout.prototype.constructor = Layout ;



Layout.create = function createLayout( def , options )
{
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	var layout = Object.create( Layout.prototype , {
		term: { value: this } ,
		def: { value: def , enumerable: true } ,
		computed: { value: {} , enumerable: true } ,
		box: { value: boxes.light , enumerable: true , writable: true } ,
		autoResize: { value: false , enumerable: true , writable: true } ,
	} ) ;
	
	Object.defineProperties( layout , {
		onResize: { value: onResize.bind( layout ) }
	} ) ;
	
	if ( options.box )
	{
		if ( typeof options.box === 'object' ) { layout.box = options.box ; }
		else if ( typeof options.box === 'string' && boxes[ options.box ] ) { layout.box = boxes[ options.box ] ; }
	}
	
	layout.compute() ;
	
	return layout ;
} ;

module.exports = Layout.create ;



Layout.prototype.compute = function compute( def , computed , parent , inProgress )
{
	var i , child , nextInProgress ;
	
	if ( ! arguments.length )
	{
		computed = this.computed ;
		
		def = this.def ;
		
		parent = {
			width: this.term.width ,
			height: this.term.height ,
			xmin: 1 ,
			ymin: 1
		} ;
		
		inProgress = {
			offsetX: 0 ,
			offsetY: 0
		} ;
	}
	
	this.computeWidthHeight( def , computed , parent , inProgress ) ;
	
	computed.xmin = parent.xmin + inProgress.offsetX ;
	computed.xmax = computed.xmin + computed.width - 1 ;
	computed.ymin = parent.ymin + inProgress.offsetY ;
	computed.ymax = computed.ymin + computed.height - 1 ;
	
	// Check if it goes out of its parent
	if ( computed.xmax > parent.xmax )
	{
		computed.xmax = parent.xmax ;
		computed.width = computed.xmax - computed.xmin + 1 ;
	}
	
	if ( computed.ymax > parent.ymax )
	{
		computed.ymax = parent.ymax ;
		computed.height = computed.ymax - computed.ymin + 1 ;
	}
	
	computed.columns = [] ;
	computed.rows = [] ;
	
	console.error( "\n\n" , computed ) ;
	
	if ( def.columns && def.columns.length )
	{
		nextInProgress = {
			offsetX: 0 ,
			offsetY: 0
		} ;
		
		for ( i = 0 ; i < def.columns.length ; i ++ )
		{
			child = {} ;
			computed.columns[ i ] = child ;
			this.compute( def.columns[ i ] , child , computed , nextInProgress ) ;
			nextInProgress.offsetX = child.xmax - computed.xmin ;
		}
	}
	else if ( def.rows && def.rows.length )
	{
		nextInProgress = {
			offsetX: 0 ,
			offsetY: 0
		} ;
		
		for ( i = 0 ; i < def.rows.length ; i ++ )
		{
			child = {} ;
			computed.rows[ i ] = child ;
			this.compute( def.rows[ i ] , child , computed , nextInProgress ) ;
			nextInProgress.offsetY = child.ymax - computed.ymin ;
		}
	}
	
	this.round( computed ) ;
	//console.error( "\n\n" , computed ) ;
} ;



Layout.prototype.computeWidthHeight = function computeWidthHeight( def , computed , parent , inProgress )
{
	if ( def.width !== undefined ) { computed.width = def.width ; }
	else if ( def.widthPercent !== undefined ) { computed.width = 2 + ( parent.width - 2 ) * def.widthPercent / 100 ; }
	else { computed.width = parent.width - inProgress.offsetX ; }
	
	if ( def.height !== undefined ) { computed.height = def.height ; }
	else if ( def.heightPercent !== undefined ) { computed.height = 2 + ( parent.height - 2 ) * def.heightPercent / 100 ; }
	else { computed.height = parent.height - inProgress.offsetY ; }
} ;
	


Layout.prototype.round = function round( computed )
{
	computed.xmin_ = Math.round( computed.xmin ) ;
	computed.xmax_ = Math.round( computed.xmax ) ;
	computed.ymin_ = Math.round( computed.ymin ) ;
	computed.ymax_ = Math.round( computed.ymax ) ;
	
	computed.width_ = computed.xmax_ - computed.xmin_ + 1 ;
	computed.height_ = computed.ymax_ - computed.ymin_ + 1 ;
} ;



Layout.prototype.draw = function draw( computed )
{
	var y ;
	
	if ( ! arguments.length )
	{
		computed = this.computed ;
		this.term.clear() ;
	}
	
	// Draw the top border
	this.term.moveTo(
		computed.xmin_ ,
		computed.ymin_ ,
		this.box.topLeft + this.box.horizontal.repeat( computed.width_ - 2 ) + this.box.topRight
	) ;
	
	// Draw the bottom border
	this.term.moveTo(
		computed.xmin_ ,
		computed.ymax_ ,
		this.box.bottomLeft + this.box.horizontal.repeat( computed.width_ - 2 ) + this.box.bottomRight
	) ;
	
	// Draw the left and right border
	for ( y = computed.ymin_ + 1 ; y < computed.ymax_ ; y ++ )
	{
		this.term.moveTo( computed.xmin_ , y , this.box.vertical ).moveTo( computed.xmax_ , y , this.box.vertical ) ;
	}
	
	this.drawRecursive( computed ) ;
} ;



Layout.prototype.drawRecursive = function drawRecursive( computed )
{
	var i ;
	
	if ( computed.columns.length )
	{
		for ( i = 0 ; i < computed.columns.length ; i ++ )
		{
			this.drawColumn( computed.columns[ i ] , i === computed.columns.length - 1 ) ;
		}
	}
	else if ( computed.rows.length )
	{
		for ( i = 0 ; i < computed.rows.length ; i ++ )
		{
			this.drawRow( computed.rows[ i ] , i === computed.rows.length - 1 ) ;
		}
	}
} ;



Layout.prototype.drawColumn = function drawColumn( computed , last )
{
	var y ;
	
	if ( ! last )
	{
		// Draw Tee-junction
		this.term.moveTo( computed.xmax_ , computed.ymin_ , this.box.topTee ) ;
		this.term.moveTo( computed.xmax_ , computed.ymax_ , this.box.bottomTee ) ;
		
		// Draw the right border
		for ( y = computed.ymin_ + 1 ; y < computed.ymax_ ; y ++ ) { this.term.moveTo( computed.xmax_ , y , this.box.vertical ) ; }
	}
	
	this.drawRecursive( computed ) ;
} ;



Layout.prototype.drawRow = function drawRow( computed , last )
{
	if ( ! last )
	{
		// Draw the bottom border
		this.term.moveTo(
			computed.xmin_ ,
			computed.ymax_ ,
			this.box.leftTee + this.box.horizontal.repeat( computed.width_ - 2 ) + this.box.rightTee
		) ;
	}
	
	this.drawRecursive( computed ) ;
} ;



Layout.prototype.setAutoResize = function setAutoResize( value )
{
	if ( value === undefined ) { value = true ; }
	else { value = !! value ; }
	
	if ( this.autoResize === value ) { return ; }
	
	this.autoResize = value ;
	
	if ( this.autoResize ) { this.term.on( 'resize' , this.onResize ) ; }
	else { this.term.removeListener( 'resize' , this.onResize ) ; }
} ;



function onResize()
{
	//console.error( 'resized!' ) ;
	this.compute() ;
	this.draw() ;
}

