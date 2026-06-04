const { PrismaClient } = require('./packages/database/node_modules/@prisma/client')

async function fixUserRole() {
  const prisma = new PrismaClient()

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'LMareka@nsa.org.na' },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      console.error('User not found')
      return
    }

    console.log('Current user:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      roles: user.userRoles.map(ur => ur.role.name)
    })

    // Check available roles
    const roles = await prisma.role.findMany()
    console.log('\nAvailable roles:', roles.map(r => r.name))

    // Look for executive roles
    const executiveRole = roles.find(r => 
      r.name.toLowerCase().includes('executive') || 
      r.name.toLowerCase().includes('hc') ||
      r.name.toLowerCase().includes('human')
    )

    if (executiveRole) {
      console.log('\nFound executive role:', executiveRole.name)
      
      // Check if user already has this role
      const hasRole = user.userRoles.some(ur => ur.roleId === executiveRole.id)
      
      if (!hasRole) {
        console.log('Assigning executive role to user...')
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: executiveRole.id
          }
        })
        console.log('✅ Role assigned successfully!')
      } else {
        console.log('User already has this role')
      }
    } else {
      console.log('\nNo executive role found. Creating one...')
      const newRole = await prisma.role.create({
        data: {
          name: 'Executive',
          description: 'Executive role for senior management'
        }
      })

      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: newRole.id
        }
      })
      console.log('✅ Created executive role and assigned to user!')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserRole()