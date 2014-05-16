Goblin.FrictionConstraint = function() {
	Goblin.Constraint.call( this );
};

Goblin.FrictionConstraint.prototype.buildFromContact = function( contact ) {
	var row_1 = this.rows[0] || Goblin.ObjectPool.getObject( 'ConstraintRow' ),
		row_2 = this.rows[1] || Goblin.ObjectPool.getObject( 'ConstraintRow' );

	this.object_a = contact.object_a;
	this.object_b = contact.object_b;

	// Find the contact point relative to object_a and object_b
	var rel_a = vec3.create(),
		rel_b = vec3.create();
	vec3.subtract( contact.contact_point, contact.object_a.position, rel_a );
	vec3.subtract( contact.contact_point, contact.object_b.position, rel_b );

	var u1 = vec3.create(),
		u2 = vec3.create();

	u1[0] = 1 - Math.abs( contact.contact_normal[0] );
	u1[1] = 1 - Math.abs( contact.contact_normal[1] );
	u1[2] = 1 - Math.abs( contact.contact_normal[2] );
	vec3.normalize( u1 );

	vec3.cross( contact.contact_normal, u1, u2 );

	/*if ( Math.abs( contact.contact_normal[2] ) > 0.7071067811865475 ) {
		// choose p in y-z plane
		var a = -contact.contact_normal[1] * contact.contact_normal[1] + contact.contact_normal[2] * contact.contact_normal[2];
		var k = 1 / Math.sqrt( a );
		u1[0] = 0;
		u1[1] = -contact.contact_normal[2] * k;
		u1[2] = contact.contact_normal[1] * k;
		// set q = n x p
		u2[0] = a * k;
		u2[1] = -contact.contact_normal[0] * u1[2];
		u2[2] = contact.contact_normal[0] * u1[1];
	}
	else {
		// choose p in x-y plane
		var a = contact.contact_normal[0] * contact.contact_normal[0] + contact.contact_normal[1] * contact.contact_normal[1];
		var k = 1 / Math.sqrt( a );
		u1[0] = -contact.contact_normal[1] * k;
		u1[1] = contact.contact_normal[0] * k;
		u1[2] = 0;
		// set q = n x p
		u2[0] = -contact.contact_normal[2] * u1[1];
		u2[1] = contact.contact_normal[2] * u1[0];
		u2[2] = a*k;
	}*/

	if ( this.object_a == null || this.object_a.mass === Infinity ) {
		row_1.jacobian[0] = row_1.jacobian[1] = row_1.jacobian[2] = 0;
		row_1.jacobian[3] = row_1.jacobian[4] = row_1.jacobian[5] = 0;
		row_2.jacobian[0] = row_2.jacobian[1] = row_2.jacobian[2] = 0;
		row_2.jacobian[3] = row_2.jacobian[4] = row_2.jacobian[5] = 0;
	} else {
		row_1.jacobian[0] = -u1[0];
		row_1.jacobian[1] = -u1[1];
		row_1.jacobian[2] = -u1[2];

		vec3.cross( rel_a, u1, _tmp_vec3_1 );
		row_1.jacobian[3] = -_tmp_vec3_1[0];
		row_1.jacobian[4] = -_tmp_vec3_1[1];
		row_1.jacobian[5] = -_tmp_vec3_1[2];

		row_2.jacobian[0] = -u2[0];
		row_2.jacobian[1] = -u2[1];
		row_2.jacobian[2] = -u2[2];

		vec3.cross( rel_a, u2, _tmp_vec3_1 );
		row_2.jacobian[3] = -_tmp_vec3_1[0];
		row_2.jacobian[4] = -_tmp_vec3_1[1];
		row_2.jacobian[5] = -_tmp_vec3_1[2];
	}

	if ( this.object_b == null || this.object_b.mass === Infinity ) {
		row_1.jacobian[6] = row_1.jacobian[7] = row_1.jacobian[8] = 0;
		row_1.jacobian[9] = row_1.jacobian[10] = row_1.jacobian[11] = 0;
		row_2.jacobian[6] = row_2.jacobian[7] = row_2.jacobian[8] = 0;
		row_2.jacobian[9] = row_2.jacobian[10] = row_2.jacobian[11] = 0;
	} else {
		row_1.jacobian[6] = u1[0];
		row_1.jacobian[7] = u1[1];
		row_1.jacobian[8] = u1[2];

		vec3.cross( rel_b, u1, _tmp_vec3_1 );
		row_1.jacobian[9] = _tmp_vec3_1[0];
		row_1.jacobian[10] = _tmp_vec3_1[1];
		row_1.jacobian[11] = _tmp_vec3_1[2];

		row_2.jacobian[6] = u2[0];
		row_2.jacobian[7] = u2[1];
		row_2.jacobian[8] = u2[2];

		vec3.cross( rel_b, u2, _tmp_vec3_1 );
		row_2.jacobian[9] = _tmp_vec3_1[0];
		row_2.jacobian[10] = _tmp_vec3_1[1];
		row_2.jacobian[11] = _tmp_vec3_1[2];
	}

	// Find total velocity between the two bodies along the contact normal
	var velocity = vec3.dot( this.object_a.linear_velocity, contact.contact_normal );
	velocity -= vec3.dot( this.object_b.linear_velocity, contact.contact_normal );

	var avg_mass = 0;
	if ( this.object_a == null || this.object_a.mass === Infinity ) {
		avg_mass = this.object_b.mass;
	} else if ( this.object_b == null || this.object_b.mass === Infinity ) {
		avg_mass = this.object_a.mass;
	} else {
		avg_mass = ( this.object_a.mass + this.object_b.mass ) / 2;
	}

	velocity = 1; // @TODO velocity calculation above needs to be total external forces, not the velocity
	var limit = contact.friction * velocity * avg_mass;
	if ( limit < 0 ) {
		limit = 0;
	}
	row_1.lower_limit = row_2.lower_limit = -limit;
	row_1.upper_limit = row_2.upper_limit = limit;

	row_1.bias = row_2.bias = 0;

	this.rows[0] = row_1;
	this.rows[1] = row_2;

	/*// Find the relative velocity at the contact point
	var velocity_a = vec3.create(),
		velocity_b = vec3.create();

	vec3.cross( contact.object_a.angular_velocity, rel_a, velocity_a );
	vec3.add( velocity_a, contact.object_a.linear_velocity );

	vec3.cross( contact.object_b.angular_velocity, rel_b, velocity_b );
	vec3.add( velocity_b, contact.object_b.linear_velocity );

	var relative_velocity = vec3.create();
	vec3.subtract( velocity_a, velocity_b, relative_velocity );

	// Remove velocity along contact normal
	var normal_velocity = vec3.dot( contact.contact_normal, relative_velocity );
	relative_velocity[0] -= normal_velocity * contact.contact_normal[0];
	relative_velocity[1] -= normal_velocity * contact.contact_normal[1];
	relative_velocity[2] -= normal_velocity * contact.contact_normal[2];

	var length = vec3.squaredLength( relative_velocity );
	if ( length >= Goblin.EPSILON ) {
		length = Math.sqrt( length );
		row.jacobian[0] = relative_velocity[0] / length;
		row.jacobian[1] = relative_velocity[1] / length;
		row.jacobian[2] = relative_velocity[2] / length;
		row.jacobian[6] = relative_velocity[0] / -length;
		row.jacobian[7] = relative_velocity[1] / -length;
		row.jacobian[8] = relative_velocity[2] / -length;
	} else {
		this.rows.length = 0;
		return;
	}

	// rel_a X N
	row.jacobian[3] = rel_a[1] * row.jacobian[2] - rel_a[2] * row.jacobian[1];
	row.jacobian[4] = rel_a[2] * row.jacobian[0] - rel_a[0] * row.jacobian[2];
	row.jacobian[5] = rel_a[0] * row.jacobian[1] - rel_a[1] * row.jacobian[0];

	// N X rel_b
	row.jacobian[9] = row.jacobian[1] * rel_b[2] - row.jacobian[2] * rel_b[1];
	row.jacobian[10] = row.jacobian[2] * rel_b[0] - row.jacobian[0] * rel_b[2];
	row.jacobian[11] = row.jacobian[0] * rel_b[1] - row.jacobian[1] * rel_b[0];

	var limit = contact.friction * 0.1;
	row.lower_limit = -limit;
	row.upper_limit = limit;
	row.bias = 0;

	this.rows.push( row );*/
};