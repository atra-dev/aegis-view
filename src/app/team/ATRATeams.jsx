"use client"

import { useState } from "react"
import Image from "next/image"
import { Users } from "lucide-react"

export default function OrganizationalChart() {
  const [activeTab, setActiveTab] = useState("atr")
  const [activeTeam, setActiveTeam] = useState("soc")
  const [activeProject, setActiveProject] = useState("aegis")

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-gray-100">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-yellow-500/20 p-3 rounded-full border border-yellow-500/30">
          <Users className="h-6 w-6 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">ATRAC</span>
          <span className="text-red-600">aaS</span> Organizational Chart
        </h1>
      </div>

      {/* Tab Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveTab("atr")}
          className={`px-6 py-2 rounded-md transition-all duration-300 font-mono text-sm
            ${activeTab === "atr" 
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
              : "bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:bg-gray-800"}`}
        >
          ATR & Associates
        </button>
        <button
          onClick={() => setActiveTab("tenant")}
          className={`px-6 py-2 rounded-md transition-all duration-300 font-mono text-sm
            ${activeTab === "tenant" 
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
              : "bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:bg-gray-800"}`}
        >
          Tenant View
        </button>
      </div>

      {activeTab === "atr" && (
        <div className="mb-10">
          <h2 className="text-center text-xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            ATR & ASSOCIATES
          </h2>
          <h3 className="text-center text-lg mb-12 text-gray-400">Organizational Chart</h3>

          <div className="flex flex-col items-center">
            {/* CEO Level */}
            <div className="mb-12 relative">
              <div className="border-2 border-yellow-500/30 rounded-lg p-4 w-72 
                           bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                           transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                               group-hover:border-yellow-500/50 transition-all duration-300">
                    <Image
                      src="/images/atr.jpg?height=80&width=80"
                      alt="Angel T. Redoble"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-400">ANGEL T. REDOBLE</p>
                    <p className="text-sm text-gray-400">CEO/Managing Partner</p>
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 bottom-0 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform translate-y-full -translate-x-1/2"></div>
            </div>

            {/* COO Level */}
            <div className="mb-12 relative">
              <div className="border-2 border-yellow-500/30 rounded-lg p-4 w-72 
                           bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                           transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                               group-hover:border-yellow-500/50 transition-all duration-300">
                    <Image
                      src="/images/ellen.jpg?height=80&width=80"
                      alt="Ellen L. Solongo"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-yellow-400">ELLEN L. SOLOSOD</p>
                    <p className="text-sm text-gray-400">COO/Senior Partner</p>
                  </div>
                </div>
              </div>
              <div className="absolute left-1/2 bottom-0 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform translate-y-full -translate-x-1/2"></div>
            </div>

            {/* Team Leaders */}
            <div className="mb-12 relative">
              <div className="bg-yellow-500/20 rounded-lg py-3 px-8 font-bold text-yellow-400 border border-yellow-500/30
                           shadow-lg hover:shadow-yellow-500/10 transition-all duration-300">
                TEAM LEADERS
              </div>
              <div className="absolute left-1/2 bottom-0 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform translate-y-full -translate-x-1/2"></div>
              <div className="absolute left-1/2 bottom-0 w-[800px] h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transform translate-y-[48px] -translate-x-1/2"></div>
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-5 gap-8 w-full max-w-6xl mb-16">
              {[
                { 
                  name: "ENGR. JUSTINE KYLE D. ALITAO,CPE",
                  image: "/images/justin.jpg",
                  role: "Team Leader"
                },
                { 
                  name: "ENGR. CALVIN REY E. EDIANEL,CPE",
                  image: "/images/calvin.jpeg",
                  role: "Team Leader"
                },
                { 
                  name: "ENGR. ESTEBAN L. LACHICA,CPE",
                  image: "/images/team_leaders/lachica_esteban_l.jpg",
                  role: "Team Leader"
                },
                { 
                  name: "ENGR. ALLINA MARIE F. MORALES,CPE",
                  image: "/images/allina.jpg",
                  role: "Team Leader"
                },
                { 
                  name: "ENGR. KIRSHE T. TIONGCO,CPE",
                  image: "/images/kirshe.jpg",
                  role: "Team Leader"
                }
              ].map((member, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                  <div className="border-2 border-yellow-500/30 rounded-lg p-4 
                               bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                               transition-all duration-300 group w-full">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                   group-hover:border-yellow-500/50 transition-all duration-300 mb-3">
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={64}
                          height={64}
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg?height=64&width=64"
                          }}
                        />
                      </div>
                      <p className="font-bold text-sm text-yellow-400 text-center">{member.name}</p>
                      <p className="text-xs text-gray-400 text-center mt-1">{member.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SOC Analysts */}
            <div className="mb-12 relative">
              {/* Modern Team Selector */}
              <div className="relative flex items-center justify-center bg-gray-800/20 backdrop-blur-lg rounded-full p-2 w-[400px] mx-auto shadow-xl border border-gray-700/20">
                <div 
                  className={`absolute transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 backdrop-blur-md border border-yellow-500/20
                            ${activeTeam === "soc" ? "left-2 w-[190px]" : "left-[202px] w-[190px]"}`} 
                  style={{ height: "calc(100% - 16px)" }}
                />
                <button
                  onClick={() => {
                    setActiveTeam("soc")
                    setActiveProject("aegis")
                  }}
                  className={`relative px-8 py-2.5 rounded-full text-base font-medium transition-all duration-300 w-[190px]
                            ${activeTeam === "soc" 
                              ? "text-yellow-400 scale-105" 
                              : "text-gray-400 hover:text-gray-200"}`}
                >
                  SOC Analysts
                </button>
                <button
                  onClick={() => setActiveTeam("innovations")}
                  className={`relative px-8 py-2.5 rounded-full text-base font-medium transition-all duration-300 w-[190px]
                            ${activeTeam === "innovations" 
                              ? "text-yellow-400 scale-105" 
                              : "text-gray-400 hover:text-gray-200"}`}
                >
                  Innovations
                </button>
              </div>
              {activeTeam === "soc" && (
                <>
                  <div className="absolute left-1/2 bottom-0 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform translate-y-full -translate-x-1/2"></div>
                  <div className="absolute left-1/2 bottom-0 w-[800px] h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transform translate-y-[48px] -translate-x-1/2"></div>
                </>
              )}
            </div>

            {/* Project Selection (Only shown when Innovations is selected) */}
            {activeTeam === "innovations" && (
              <div className="mb-12">
                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={() => setActiveProject("aegis")}
                    className={`px-6 py-2 rounded-lg transition-all duration-300 font-mono text-sm
                      ${activeProject === "aegis" 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                        : "bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:bg-gray-800"}`}
                  >
                    PROJECT AEGIS
                  </button>
                  <button
                    onClick={() => setActiveProject("cerberus")}
                    className={`px-6 py-2 rounded-lg transition-all duration-300 font-mono text-sm
                      ${activeProject === "cerberus" 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                        : "bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:bg-gray-800"}`}
                  >
                    PROJECT CERBERUS
                  </button>
                </div>
              </div>
            )}

            {/* Team Content */}
            {activeTeam === "soc" ? (
              /* SOC Analysts Grid */
              <div className="grid grid-cols-5 gap-8 w-full max-w-6xl">
                {[
                  {
                    name: "ANGCOS, MARK JOSEPH E.",
                    image: "/images/analysts/angcos_mark_joseph_e.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "BALAURO, BERNARD P.",
                    image: "/images/analysts/balauro_bernard_p.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "BORCE, PRINCE ARIEL A.",
                    image: "/images/analysts/borce_prince_ariel_a.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "CHUA, HILLARY GABRIEL G.",
                    image: "/images/analysts/chua_hillary_gabriel_g.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "CONDAT, JORIES ANTON V.",
                    image: "/images/analysts/jories_anton_v_condat.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "DAQUILA, ERIC JOHN M.",
                    image: "/images/analysts/daquila_eric_john_m.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "CUNANAN, KIM GERARD D.",
                    image: "/images/analysts/cunanan_kim_gerard_d.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "DIANO, HITLER B.",
                    image: "/images/analysts/diano_hitler_b.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "DIAZ, RELYN ANN L.",
                    image: "/images/analysts/diaz_relyn_ann_l.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "DUSARAN, JOHN PAUL E.",
                    image: "/images/analysts/dusaran_john_paul_e.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "ESCAMILLA, JAN DENISE J.",
                    image: "/images/analysts/escamilla_jan_denise_j.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "ESTEBAN, JOHN MARK C.",
                    image: "/images/analysts/esteban_john_mark_c.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "FERNANDEZ, JOANALYN Y.",
                    image: "/images/analysts/fernandez_joanalyn_y.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "LAPE, MARY ROSE O.",
                    image: "/images/analysts/lape_mary_rose_o.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "MANRIQUE, JEANNE LEIGH F.",
                    image: "/images/analysts/manrique_jeanne_leigh_f.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "MARTINEZ, MART ANGELO G.",
                    image: "/images/analysts/martinez_mart_angelo_g.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "MIRANDA, JAYLORD M.",
                    image: "/images/analysts/miranda_jaylord_m.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "USON, JOHN CLIFFORD B.",
                    image: "/images/analysts/uson_john_clifford_b.jpg",
                    role: "SOC Analyst"
                  },
                  {
                    name: "VETRIOLO, DANIEL JR A.",
                    image: "/images/analysts/vetriolo_daniel_a.jpg",
                    role: "SOC Analyst"
                  }
                ].map((member, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                    <div className="border-2 border-yellow-500/30 rounded-lg p-4 
                                 bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                                 transition-all duration-300 group w-full">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                     group-hover:border-yellow-500/50 transition-all duration-300 mb-3">
                          <Image
                            src={member.image}
                            alt={member.name}
                            width={64}
                            height={64}
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = "/placeholder.svg?height=64&width=64"
                            }}
                          />
                        </div>
                        <p className="font-bold text-sm text-yellow-400 text-center">{member.name}</p>
                        <p className="text-xs text-gray-400 text-center mt-1">{member.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeProject === "aegis" ? (
              /* Project Aegis Team */
              <div className="w-full max-w-6xl">
                {/* Team Lead */}
                <div className="flex justify-center mb-16">
                  <div className="border-2 border-yellow-500/30 rounded-lg p-6 
                               bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                               transition-all duration-300 group w-96">
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                   group-hover:border-yellow-500/50 transition-all duration-300 mb-4">
                        <Image
                          src="/images/calvin.jpeg"
                          alt="ENGR. CALVIN REY E. EDIANEL"
                          width={96}
                          height={96}
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg?height=96&width=96"
                          }}
                        />
                      </div>
                      <p className="font-bold text-lg text-yellow-400 text-center">ENGR. CALVIN REY E. EDIANEL, CPE</p>
                      <p className="text-sm text-gray-400 text-center mt-1">Project Aegis Technical Head</p>
                    </div>
                  </div>
                </div>

                {/* Connecting Lines */}
                <div className="relative w-full h-12 mb-8">
                  <div className="absolute left-1/2 w-[600px] h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                  <div className="absolute left-1/2 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                </div>

                {/* Team Members */}
                <div className="grid grid-cols-4 gap-8 w-full max-w-4xl mx-auto">
                  {[
                    {
                      name: "ENGR. ALLINA MARIE F. MORALES, CPE",
                      image: "/images/allina.jpg",
                      role: "Project Aegis Technical Consultant"
                    },
                    {
                      name: "CHUA, HILLARY GABRIEL G.",
                      image: "/images/analysts/chua_hillary_gabriel_g.jpg",
                      role: "Project Aegis Security Tester Assistant"
                    },
                    {
                      name: "MARTINEZ, MART ANGELO G.",
                      image: "/images/analysts/martinez_mart_angelo_g.jpg",
                      role: "Project Aegis Security Developer"
                    },
                    {
                      name: "USON, JOHN CLIFFORD B.",
                      image: "/images/analysts/uson_john_clifford_b.jpg",
                      role: "Project Aegis Documentation Specialist"
                    }
                  ].map((member, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                      <div className="border-2 border-yellow-500/30 rounded-lg p-4 
                                   bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                                   transition-all duration-300 group w-full">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                       group-hover:border-yellow-500/50 transition-all duration-300 mb-3">
                            <Image
                              src={member.image}
                              alt={member.name}
                              width={80}
                              height={80}
                              className="object-cover"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg?height=80&width=80"
                              }}
                            />
                          </div>
                          <p className="font-bold text-sm text-yellow-400 text-center">{member.name}</p>
                          <p className="text-xs text-gray-400 text-center mt-1">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Project Cerberus Team */
              <div className="w-full max-w-6xl">
                {/* Team Lead */}
                <div className="flex justify-center mb-16">
                  <div className="border-2 border-yellow-500/30 rounded-lg p-6 
                               bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                               transition-all duration-300 group w-96">
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                   group-hover:border-yellow-500/50 transition-all duration-300 mb-4">
                        <Image
                          src="/images/team_leaders/lachica_esteban_l.jpg"
                          alt="ENGR. ESTEBAN L. LACHICA"
                          width={96}
                          height={96}
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg?height=96&width=96"
                          }}
                        />
                      </div>
                      <p className="font-bold text-lg text-yellow-400 text-center">ENGR. ESTEBAN L. LACHICA, CPE</p>
                      <p className="text-sm text-gray-400 text-center mt-1">Project Cerberus Technical Head</p>
                    </div>
                  </div>
                </div>

                {/* Connecting Lines */}
                <div className="relative w-full h-12 mb-8">
                  <div className="absolute left-1/2 w-[400px] h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                  <div className="absolute left-1/2 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                </div>

                {/* Team Members */}
                <div className="grid grid-cols-2 gap-8 w-full max-w-2xl mx-auto">
                  {[
                    {
                      name: "ENGR. JUSTINE KYLE D. ALITAO, CPE",
                      image: "/images/justin.jpg",
                      role: "Project Cerberus Developer"
                    },
                    {
                      name: "ENGR. CALVIN REY E. EDIANEL, CPE",
                      image: "/images/calvin.jpeg",
                      role: "Project Cerberus Developer"
                    }
                  ].map((member, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                      <div className="border-2 border-yellow-500/30 rounded-lg p-4 
                                   bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-yellow-500/10
                                   transition-all duration-300 group w-full">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30
                                       group-hover:border-yellow-500/50 transition-all duration-300 mb-3">
                            <Image
                              src={member.image}
                              alt={member.name}
                              width={80}
                              height={80}
                              className="object-cover"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg?height=80&width=80"
                              }}
                            />
                          </div>
                          <p className="font-bold text-sm text-yellow-400 text-center">{member.name}</p>
                          <p className="text-xs text-gray-400 text-center mt-1">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tenant" && (
        <div className="mb-10">
          <h2 className="text-center text-xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Tenant Organization
          </h2>
          <h3 className="text-center text-lg mb-12 text-gray-400">Team Structure</h3>

          <div className="flex">
            {/* Left side labels */}
            <div className="w-48 flex flex-col gap-6 pr-8 mt-8">
              {[
                { label: "EAS", active: true },
                { label: "SOC", active: true },
                { label: "ATIP", active: false },
                { label: "VA", active: false },
                { label: "GRC", active: true }
              ].map((item, index) => (
                <div key={index} 
                     className={`py-2 px-6 text-center rounded-full transition-all duration-300
                               ${item.active 
                                 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:shadow-yellow-500/10" 
                                 : "text-gray-400"}`}>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Right side content */}
            <div className="flex-1">
              <div className="flex flex-col items-center">
                {/* Management Level */}
                <div className="flex justify-center gap-8 mb-16">
                  {/* SDM Card */}
                  <div className="border-2 border-yellow-500/30 rounded-2xl p-4 w-72
                               bg-gray-800/50 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30 mb-3">
                        <Image
                          src="/images/justin.jpg"
                          alt="ENGR. JUSTINE KYLE D. ALITAO"
                          width={96}
                          height={96}
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg?height=96&width=96"
                          }}
                        />
                      </div>
                      <p className="font-bold text-sm text-yellow-400 text-center">ENGR. JUSTINE KYLE D. ALITAO,CPE</p>
                      <p className="text-xs text-gray-400 text-center mt-1">Service Delivery Manager(SDM)</p>
                    </div>
                  </div>

                  {/* GRC Specialist Card */}
                  <div className="border-2 border-yellow-500/30 rounded-2xl p-4 w-72
                               bg-gray-800/50 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 border-2 border-yellow-500/30 mb-3">
                        <Image
                          src="/images/calvin.jpeg"
                          alt="ENGR. CALVIN REY E. EDIANEL"
                          width={96}
                          height={96}
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg?height=96&width=96"
                          }}
                        />
                      </div>
                      <p className="font-bold text-sm text-yellow-400 text-center">ENGR. CALVIN REY E. EDIANEL,CPE</p>
                      <p className="text-xs text-gray-400 text-center mt-1">GRC Specialist</p>
                    </div>
                  </div>
                </div>

                {/* Connecting Lines */}
                <div className="relative w-full h-12 mb-8">
                  <div className="absolute left-1/2 w-[400px] h-0.5 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                  <div className="absolute left-1/2 w-0.5 h-12 bg-gradient-to-b from-yellow-500/50 to-transparent transform -translate-x-1/2"></div>
                </div>

                {/* Incident Responders Header */}
                <div className="bg-yellow-300 rounded-lg py-3 px-12 font-bold text-gray-900 mb-12">
                  INCIDENT RESPONDERS
                </div>

                {/* Incident Responders Grid */}
                <div className="grid grid-cols-2 gap-16 w-full max-w-2xl">
                  {/* IR 1 */}
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                    <div className="border-2 border-yellow-500/30 rounded-2xl p-6
                                 bg-gray-800/50 backdrop-blur-sm shadow-lg w-48 h-48
                                 flex items-center justify-center">
                      <p className="font-bold text-yellow-400 text-xl">IR 1</p>
                    </div>
                  </div>

                  {/* IR 2 */}
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-0.5 bg-gradient-to-b from-yellow-500/50 to-transparent mb-4"></div>
                    <div className="border-2 border-yellow-500/30 rounded-2xl p-6
                                 bg-gray-800/50 backdrop-blur-sm shadow-lg w-48 h-48
                                 flex items-center justify-center">
                      <p className="font-bold text-yellow-400 text-xl">IR 2</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
